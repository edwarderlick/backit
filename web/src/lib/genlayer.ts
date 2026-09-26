"use client";

import { createClient } from "genlayer-js";
import { TransactionStatus } from "genlayer-js/types";
import {
  browserRpc,
  EXPLORER_URL,
  PUBLIC_RPC,
  STUDIO_NEXT_CHAIN,
  STUDIO_NEXT_CHAIN_ID,
  STUDIO_NEXT_HEX,
} from "./chain";
import { getActiveProvider, type EthereumProvider } from "./injected-wallets";

export type { EthereumProvider };

export function buildClient(account?: string | null, provider?: EthereumProvider) {
  return createClient({
    chain: STUDIO_NEXT_CHAIN,
    endpoint: browserRpc(),
    ...(account ? { account: account as `0x${string}` } : {}),
    ...(provider ? { provider } : {}),
  } as Parameters<typeof createClient>[0]);
}

/** Reads do not need a wallet. Browse uses this so the feed is not stuck on connect. */
export function buildReadClient() {
  return buildClient();
}

export function assertExecutionOk(receipt: unknown): void {
  const rec = receipt as Record<string, unknown> | null;
  if (!rec) return;
  const execName = String(rec.txExecutionResultName || rec.execution_result || "");
  if (/ERROR|FAILED|ROLLBACK/i.test(execName) && /FINISHED_WITH_RETURN/i.test(execName) === false) {
    if (/FINISHED_WITH_ERROR|ERROR|FAILED|rollback/i.test(execName)) {
      throw new Error(`Studio Next execution failed: ${execName}`);
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

export async function switchToStudioNext(eth: EthereumProvider) {
  const chainIdHex = String(await eth.request({ method: "eth_chainId" }));
  const current = parseInt(chainIdHex, 16);
  const target = STUDIO_NEXT_CHAIN.id || STUDIO_NEXT_CHAIN_ID;
  if (current === target) return current;
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: STUDIO_NEXT_HEX }],
    });
  } catch (switchError: unknown) {
    const code = (switchError as { code?: number }).code;
    if (code === 4902 || code === -32603) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: STUDIO_NEXT_HEX,
            chainName: "GenLayer Studio Next",
            rpcUrls: [PUBLIC_RPC],
            nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
            blockExplorerUrls: [EXPLORER_URL],
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
