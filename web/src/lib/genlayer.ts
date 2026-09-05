"use client";

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { STUDIONET_CHAIN_ID, STUDIONET_HEX, STUDIONET_RPC } from "./chain";
import { getActiveProvider, type EthereumProvider } from "./injected-wallets";

export type { EthereumProvider };

function browserEndpoint(): string {
  if (typeof window === "undefined") return STUDIONET_RPC;
  return `${window.location.origin}/api/genlayer`;
}

export function buildClient(account?: string | null, provider?: EthereumProvider) {
  return createClient({
    chain: studionet,
    endpoint: browserEndpoint(),
    ...(account ? { account: account as `0x${string}` } : {}),
    ...(provider ? { provider } : {}),
  } as Parameters<typeof createClient>[0]);
}

export function assertExecutionOk(receipt: unknown): void {
  const rec = receipt as Record<string, unknown> | null;
  if (!rec) return;
  const execName = String(rec.txExecutionResultName || rec.execution_result || "");
  if (/ERROR|FAILED|ROLLBACK/i.test(execName) && /FINISHED_WITH_RETURN/i.test(execName) === false) {
    if (/FINISHED_WITH_ERROR|ERROR|FAILED|rollback/i.test(execName)) {
      throw new Error(`StudioNet execution failed: ${execName}`);
    }
  }
  const consensus = rec.consensus_data as Record<string, unknown> | undefined;
  const leaders = consensus?.leader_receipt as unknown[] | undefined;
  const leader = (leaders && leaders[0]) as Record<string, unknown> | undefined;
  if (!leader) return;
  const er = String(leader.execution_result || "");
  if (/ERROR|FAILED/i.test(er)) {
    throw new Error(`Leader execution failed: ${er}`);
  }
  const result = leader.result as Record<string, unknown> | string | undefined;
  if (result && typeof result === "object") {
    const status = String(result.status || "");
    if (status === "rollback" || status === "error") {
      throw new Error(`Leader rolled back: ${JSON.stringify(result.payload ?? result)}`);
    }
  }
}

export function extractReturnedId(receipt: unknown): string | null {
  const rec = receipt as Record<string, unknown> | null;
  if (!rec) return null;
  const consensus = rec.consensus_data as Record<string, unknown> | undefined;
  const leaders = consensus?.leader_receipt as unknown[] | undefined;
  const leader = (leaders && leaders[0]) as Record<string, unknown> | undefined;
  const result = leader?.result ?? rec.result;
  const blobs: string[] = [];
  const walk = (v: unknown) => {
    if (v == null) return;
    if (typeof v === "string") blobs.push(v);
    else if (typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (typeof o.readable === "string") blobs.push(o.readable);
      if (typeof o.payload === "string") blobs.push(o.payload);
      else if (o.payload) walk(o.payload);
      Object.values(o).forEach((x) => {
        if (x !== o.payload) walk(x);
      });
    }
  };
  walk(result);
  for (const b of blobs) {
    const m = b.match(/[0-9a-f]{64}/i);
    if (m) return m[0].toLowerCase();
  }
  return null;
}

export async function waitReceipt(client: ReturnType<typeof createClient>, hash: `0x${string}`) {
  let receipt: unknown;
  const waitFinal = (
    client as { waitForFinalization?: (a: { hash: `0x${string}` }) => Promise<unknown> }
  ).waitForFinalization;
  if (typeof waitFinal === "function") {
    receipt = await waitFinal({ hash });
  } else {
    receipt = await client.waitForTransactionReceipt({
      hash: hash as Parameters<typeof client.waitForTransactionReceipt>[0]["hash"],
      status: TransactionStatus.FINALIZED,
      retries: 80,
      interval: 3000,
    });
  }
  assertExecutionOk(receipt);
  return receipt;
}

export function getEthereum(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  return getActiveProvider() || (window as unknown as { ethereum?: EthereumProvider }).ethereum;
}

export async function switchToStudioNet(eth: EthereumProvider) {
  const chainIdHex = String(await eth.request({ method: "eth_chainId" }));
  const current = parseInt(chainIdHex, 16);
  const target = studionet.id || STUDIONET_CHAIN_ID;
  if (current === target) return current;
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: STUDIONET_HEX }],
    });
  } catch (switchError: unknown) {
    const code = (switchError as { code?: number }).code;
    if (code === 4902 || code === -32603) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: STUDIONET_HEX,
            chainName: "GenLayer StudioNet",
            rpcUrls: [STUDIONET_RPC],
            nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
            blockExplorerUrls: ["https://explorer-studio.genlayer.com"],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
  const after = String(await eth.request({ method: "eth_chainId" }));
  return parseInt(after, 16);
}
