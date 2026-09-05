export type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

export type DetectedWallet = {
  id: string;
  name: string;
  rdns?: string;
  icon?: string;
  provider: EthereumProvider;
};

export const WALLET_STORAGE_KEY = "backit.wallet";

export type StoredWallet = {
  id: string;
  address: string;
  rdns?: string;
};

export const CATALOG: {
  name: string;
  rdns: string;
  installUrl: string;
}[] = [
  { name: "MetaMask", rdns: "io.metamask", installUrl: "https://metamask.io/download/" },
  { name: "Rabby", rdns: "io.rabby", installUrl: "https://rabby.io/" },
  { name: "Coinbase Wallet", rdns: "com.coinbase.wallet", installUrl: "https://www.coinbase.com/wallet/downloads" },
  { name: "Brave Wallet", rdns: "com.brave.wallet", installUrl: "https://brave.com/wallet/" },
  { name: "OKX Wallet", rdns: "com.okex.wallet", installUrl: "https://www.okx.com/web3" },
];

type Eip6963Announce = Event & {
  detail?: {
    info?: { uuid?: string; name?: string; icon?: string; rdns?: string };
    provider?: EthereumProvider;
  };
};

type FlaggedProvider = EthereumProvider & {
  isMetaMask?: boolean;
  isRabby?: boolean;
  isBraveWallet?: boolean;
  isCoinbaseWallet?: boolean;
  isRainbow?: boolean;
  isOkxWallet?: boolean;
  isPhantom?: boolean;
  providers?: FlaggedProvider[];
};

function nameFromFlags(p: FlaggedProvider): string {
  if (p.isRabby) return "Rabby";
  if (p.isBraveWallet) return "Brave Wallet";
  if (p.isCoinbaseWallet) return "Coinbase Wallet";
  if (p.isRainbow) return "Rainbow";
  if (p.isOkxWallet) return "OKX Wallet";
  if (p.isPhantom) return "Phantom";
  if (p.isMetaMask) return "MetaMask";
  return "Browser wallet";
}

function rdnsFromFlags(p: FlaggedProvider): string {
  if (p.isRabby) return "io.rabby";
  if (p.isBraveWallet) return "com.brave.wallet";
  if (p.isCoinbaseWallet) return "com.coinbase.wallet";
  if (p.isRainbow) return "me.rainbow";
  if (p.isOkxWallet) return "com.okex.wallet";
  if (p.isPhantom) return "app.phantom";
  if (p.isMetaMask) return "io.metamask";
  return "legacy.injected";
}

function enumerateWindowProviders(): DetectedWallet[] {
  if (typeof window === "undefined") return [];
  const w = window as unknown as {
    ethereum?: FlaggedProvider;
    coinbaseWalletExtension?: FlaggedProvider;
    okxwallet?: FlaggedProvider;
    rabby?: FlaggedProvider;
  };
  const found: DetectedWallet[] = [];
  const seen = new Set<EthereumProvider>();

  const push = (id: string, provider?: FlaggedProvider) => {
    if (!provider || seen.has(provider)) return;
    seen.add(provider);
    found.push({
      id,
      name: nameFromFlags(provider),
      rdns: rdnsFromFlags(provider),
      provider,
    });
  };

  const eth = w.ethereum;
  if (eth?.providers?.length) {
    eth.providers.forEach((p, i) => push(`window.ethereum.providers.${i}`, p));
  } else if (eth) {
    push("window.ethereum", eth);
  }
  push("coinbaseWalletExtension", w.coinbaseWalletExtension);
  push("okxwallet", w.okxwallet);
  push("rabby", w.rabby);
  return found;
}

export function discoverInjectedWallets(onChange: (wallets: DetectedWallet[]) => void): () => void {
  const byId = new Map<string, DetectedWallet>();

  const publish = () => {
    if (byId.size === 0) {
      onChange(enumerateWindowProviders());
      return;
    }
    onChange([...byId.values()]);
  };

  const onAnnounce = (event: Event) => {
    const detail = (event as Eip6963Announce).detail;
    const info = detail?.info;
    const provider = detail?.provider;
    if (!info?.uuid || !provider) return;
    byId.set(info.uuid, {
      id: info.uuid,
      name: info.name || "Browser wallet",
      rdns: info.rdns,
      icon: info.icon,
      provider,
    });
    publish();
  };

  window.addEventListener("eip6963:announceProvider", onAnnounce as EventListener);
  window.dispatchEvent(new Event("eip6963:requestProvider"));

  const fallback = window.setTimeout(() => {
    publish();
  }, 80);

  return () => {
    window.clearTimeout(fallback);
    window.removeEventListener("eip6963:announceProvider", onAnnounce as EventListener);
  };
}

let activeProvider: EthereumProvider | undefined;

export function setActiveProvider(provider?: EthereumProvider) {
  activeProvider = provider;
}

export function getActiveProvider(): EthereumProvider | undefined {
  return activeProvider;
}

export function readStoredWallet(): StoredWallet | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WALLET_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredWallet;
    if (!parsed.id || !parsed.address) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredWallet(value: StoredWallet | null) {
  if (typeof window === "undefined") return;
  if (!value) {
    window.localStorage.removeItem(WALLET_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(value));
}

export function catalogMisses(wallets: DetectedWallet[]) {
  const rdns = new Set(wallets.map((w) => (w.rdns || "").toLowerCase()));
  const names = new Set(wallets.map((w) => w.name.toLowerCase()));
  return CATALOG.filter(
    (row) =>
      !rdns.has(row.rdns.toLowerCase()) &&
      ![...names].some((n) => n.includes(row.name.toLowerCase().split(" ")[0])),
  );
}
