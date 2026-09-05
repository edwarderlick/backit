"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { studionet } from "genlayer-js/chains";
import { STUDIONET_CHAIN_ID } from "@/lib/chain";
import {
  buildClient,
  switchToStudioNet,
  type EthereumProvider,
} from "@/lib/genlayer";
import {
  discoverInjectedWallets,
  getActiveProvider,
  readStoredWallet,
  setActiveProvider,
  writeStoredWallet,
  type DetectedWallet,
} from "@/lib/injected-wallets";


type Ctx = {
  client: ReturnType<typeof buildClient> | null;
  account: string | null;
  connect: () => Promise<void>;
  connectWallet: (wallet: DetectedWallet) => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
  error: string | null;
  chainId: number | null;
  wrongNetwork: boolean;
  modalOpen: boolean;
  openWalletModal: () => void;
  closeWalletModal: () => void;
  wallets: DetectedWallet[];
};

const GenLayerContext = createContext<Ctx>({
  client: null,
  account: null,
  connect: async () => {},
  connectWallet: async () => {},
  disconnect: () => {},
  isConnecting: false,
  error: null,
  chainId: null,
  wrongNetwork: false,
  modalOpen: false,
  openWalletModal: () => {},
  closeWalletModal: () => {},
  wallets: [],
});

export const useGenLayer = () => useContext(GenLayerContext);

async function liveAccounts(eth: EthereumProvider): Promise<string[]> {
  try {
    const accounts = (await eth.request({ method: "eth_accounts" })) as string[];
    return Array.isArray(accounts) ? accounts : [];
  } catch {
    return [];
  }
}

export function GenLayerProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<ReturnType<typeof buildClient> | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [wallets, setWallets] = useState<DetectedWallet[]>([]);
  const providerRef = useRef<EthereumProvider | undefined>(undefined);
  const walletIdRef = useRef<string | null>(null);

  const openWalletModal = useCallback(() => {
    setError(null);
    setModalOpen(true);
  }, []);

  const closeWalletModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setChainId(null);
    setError(null);
    setClient(null);
    providerRef.current = undefined;
    walletIdRef.current = null;
    setActiveProvider(undefined);
    writeStoredWallet(null);
    setModalOpen(false);
  }, []);

  const paint = useCallback(async (wallet: DetectedWallet, addr: string) => {
    setActiveProvider(wallet.provider);
    providerRef.current = wallet.provider;
    walletIdRef.current = wallet.id;
    setAccount(addr);
    writeStoredWallet({ id: wallet.id, address: addr, rdns: wallet.rdns });
    try {
      const hex = String(await wallet.provider.request({ method: "eth_chainId" }));
      setChainId(parseInt(hex, 16));
    } catch {
      /* chain read is best-effort */
    }
    setClient(buildClient(addr, wallet.provider));
  }, []);

  const connectWallet = useCallback(
    async (wallet: DetectedWallet) => {
      setIsConnecting(true);
      setError(null);
      try {
        const accounts = (await wallet.provider.request({
          method: "eth_requestAccounts",
        })) as string[];
        const addr = accounts?.[0];
        if (!addr) throw new Error("Wallet did not return an account.");
        let nextChain = await switchToStudioNet(wallet.provider);
        try {
          const c = buildClient(addr, wallet.provider);
          if (typeof (c as { connect?: (n: string) => Promise<void> }).connect === "function") {
            await (c as { connect: (n: string) => Promise<void> }).connect("studionet");
          }
        } catch {
          /* Snap is optional. Permission already granted via eth_requestAccounts. */
        }
        const confirmed = await liveAccounts(wallet.provider);
        if (confirmed.length === 0) {
          disconnect();
          throw new Error("Wallet did not grant this origin.");
        }
        const live = confirmed.find((a) => a.toLowerCase() === addr.toLowerCase()) ?? confirmed[0];
        await paint(wallet, live);
        try {
          const hex = String(await wallet.provider.request({ method: "eth_chainId" }));
          nextChain = parseInt(hex, 16);
          setChainId(nextChain);
        } catch {
          /* ignore */
        }
        setModalOpen(false);
      } catch (err: unknown) {
        const code = (err as { code?: number }).code;
        if (code === 4001) {
          setError("Connection rejected.");
        } else {
          setError(err instanceof Error ? err.message : "Failed to connect wallet.");
        }
      } finally {
        setIsConnecting(false);
      }
    },
    [disconnect, paint],
  );

  const connect = useCallback(async () => {
    openWalletModal();
  }, [openWalletModal]);

  useEffect(() => {
    return discoverInjectedWallets(setWallets);
  }, []);

  useEffect(() => {
    if (isConnecting || account) return;
    const stored = readStoredWallet();
    if (!stored) return;
    const match =
      wallets.find((w) => w.id === stored.id) ||
      (stored.rdns ? wallets.find((w) => w.rdns === stored.rdns) : undefined);
    if (!match) return;
    void liveAccounts(match.provider).then((accounts) => {
      if (accounts.length === 0) {
        writeStoredWallet(null);
        return;
      }
      const live =
        accounts.find((a) => a.toLowerCase() === stored.address.toLowerCase()) ?? accounts[0];
      void paint(match, live);
    });
  }, [wallets, isConnecting, account, paint]);

  useEffect(() => {
    const eth = providerRef.current || getActiveProvider();
    if (!eth) return;
    const onAccounts = (...args: unknown[]) => {
      const accounts = (args[0] as string[]) || [];
      if (accounts.length === 0) {
        disconnect();
        return;
      }
      setAccount(accounts[0]);
      const id = walletIdRef.current;
      if (id) writeStoredWallet({ id, address: accounts[0] });
    };
    const onChain = (...args: unknown[]) => {
      setChainId(parseInt(String(args[0]), 16));
    };
    eth.on?.("accountsChanged", onAccounts);
    eth.on?.("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, [account, disconnect]);

  useEffect(() => {
    if (!account) return;
    const provider = providerRef.current;
    setClient(buildClient(account, provider));
  }, [account]);

  const target = studionet.id || STUDIONET_CHAIN_ID;
  const wrongNetwork = Boolean(account && chainId && chainId !== target);

  return (
    <GenLayerContext.Provider
      value={{
        client,
        account,
        connect,
        connectWallet,
        disconnect,
        isConnecting,
        error,
        chainId,
        wrongNetwork,
        modalOpen,
        openWalletModal,
        closeWalletModal,
        wallets,
      }}
    >
      {children}
    </GenLayerContext.Provider>
  );
}
