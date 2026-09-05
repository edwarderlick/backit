"use client";

import { CONTRACT_ADDRESS } from "./chain";
import { diffNewIds } from "./ids";
import { toWei } from "./format";
import { extractReturnedId, waitReceipt } from "./genlayer";

export type BackRecord = {
  id: string;
  poster: string;
  prover: string;
  claim: string;
  source_url: string;
  kind: string;
  state: string;
  amount: string;
  created_at: string;
  outcome: string;
  quote: string;
  reason: string;
  fee_paid: string;
  paid_to_poster: string;
  paid_to_prover: string;
  credit_poster: string;
  credit_prover: string;
  attestation_json: string;
};

export type Economics = {
  treasury: string;
  locked: string;
  credits: string;
  fee_bps: string;
};

function requireAddress() {
  if (!CONTRACT_ADDRESS) {
    throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS is not set");
  }
  return CONTRACT_ADDRESS;
}

function asRecord(raw: unknown): BackRecord {
  const p = (raw ?? {}) as Record<string, unknown>;
  const s = (k: string) => (p[k] == null ? "" : String(p[k]));
  return {
    id: s("id"),
    poster: s("poster"),
    prover: s("prover"),
    claim: s("claim"),
    source_url: s("source_url"),
    kind: s("kind"),
    state: s("state"),
    amount: s("amount"),
    created_at: s("created_at"),
    outcome: s("outcome"),
    quote: s("quote"),
    reason: s("reason"),
    fee_paid: s("fee_paid"),
    paid_to_poster: s("paid_to_poster"),
    paid_to_prover: s("paid_to_prover"),
    credit_poster: s("credit_poster"),
    credit_prover: s("credit_prover"),
    attestation_json: s("attestation_json"),
  };
}

export async function listIds(client: any): Promise<string[]> {
  const ids = await client.readContract({
    address: requireAddress(),
    functionName: "list_ids",
    args: [],
  });
  return Array.isArray(ids) ? ids.map((x: unknown) => String(x)) : [];
}

export async function getBack(client: any, id: string): Promise<BackRecord> {
  const raw = await client.readContract({
    address: requireAddress(),
    functionName: "get_back",
    args: [id],
  });
  return asRecord(raw);
}

export async function getEconomics(client: any): Promise<Economics> {
  const raw = (await client.readContract({
    address: requireAddress(),
    functionName: "get_economics",
    args: [],
  })) as Record<string, unknown>;
  return {
    treasury: String(raw?.treasury ?? 0),
    locked: String(raw?.locked ?? 0),
    credits: String(raw?.credits ?? 0),
    fee_bps: String(raw?.fee_bps ?? 250),
  };
}

export async function getCredit(client: any, addr: string): Promise<bigint> {
  const raw = await client.readContract({
    address: requireAddress(),
    functionName: "get_credit",
    args: [addr],
  });
  return toWei(raw as string | number | bigint);
}

export async function listBacks(client: any): Promise<BackRecord[]> {
  const ids = await listIds(client);
  const out: BackRecord[] = [];
  for (const id of [...ids].reverse()) {
    try {
      out.push(await getBack(client, id));
    } catch {
      /* skip missing */
    }
  }
  return out;
}

function rpcText(err: unknown): string {
  if (err instanceof Error) return `${err.message} ${String((err as { cause?: unknown }).cause ?? "")}`;
  return String(err);
}

function isStudioRpcBlip(err: unknown): boolean {
  return /unknown RPC error|Failed to fetch|fetch failed|Internal JSON-RPC|Server busy|429|rate limit|timeout|NETWORK_ERROR/i.test(
    rpcText(err),
  );
}

function describeWriteError(err: unknown): Error {
  if (isStudioRpcBlip(err)) {
    return new Error(
      "StudioNet RPC blipped after the wallet signed. Check MetaMask Activity. If the first lock already landed, do not click Lock again.",
    );
  }
  return err instanceof Error ? err : new Error(String(err));
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function write(
  client: any,
  functionName: string,
  args: unknown[],
  value?: bigint
): Promise<{ hash: `0x${string}`; receipt: unknown }> {
  const call = {
    address: requireAddress(),
    functionName,
    args,
    ...(value !== undefined ? { value } : {}),
  };
  // StudioNet is gasless. Fee estimation is an extra RPC that often throws
  // viem "unknown RPC error" after MetaMask already broadcast the write.
  const hash = (await client.writeContract(call)) as `0x${string}`;
  const receipt = await waitReceipt(client, hash);
  return { hash, receipt };
}

export async function backClaim(
  client: any,
  claim: string,
  sourceUrl: string,
  kind: string,
  valueWei: bigint
): Promise<{ id: string; tx: `0x${string}` }> {
  const before = await listIds(client);
  try {
    const { hash, receipt } = await write(client, "back", [claim, sourceUrl, kind], valueWei);
    const fromReceipt = extractReturnedId(receipt);
    if (fromReceipt) {
      return { id: fromReceipt, tx: hash };
    }
    const after = await listIds(client);
    const created = diffNewIds(before, after);
    if (created.length === 0) {
      throw new Error("Transaction finalized but no new back id appeared in contract storage.");
    }
    return { id: created[created.length - 1], tx: hash };
  } catch (err) {
    if (!isStudioRpcBlip(err)) throw describeWriteError(err);
    const hashFromErr = extractTxHash(err);
    const deadline = Date.now() + 180_000;
    while (Date.now() < deadline) {
      await delay(4000);
      try {
        const after = await listIds(client);
        const created = diffNewIds(before, after);
        if (created.length > 0) {
          return { id: created[created.length - 1], tx: (hashFromErr || "0x") as `0x${string}` };
        }
      } catch {
        /* Studio read blip while consensus is still running */
      }
    }
    throw describeWriteError(err);
  }
}

function extractTxHash(err: unknown): `0x${string}` | undefined {
  const bag = err as {
    hash?: unknown;
    transactionHash?: unknown;
    cause?: { hash?: unknown; transactionHash?: unknown };
  };
  const candidates = [bag?.hash, bag?.transactionHash, bag?.cause?.hash, bag?.cause?.transactionHash];
  for (const c of candidates) {
    if (typeof c === "string" && /^0x[a-fA-F0-9]{64}$/.test(c)) return c as `0x${string}`;
  }
  const m = rpcText(err).match(/0x[a-fA-F0-9]{64}/);
  return m ? (m[0] as `0x${string}`) : undefined;
}

export async function proveBack(client: any, id: string) {
  try {
    return await write(client, "prove", [id]);
  } catch (err) {
    throw describeWriteError(err);
  }
}

export async function cancelBack(client: any, id: string) {
  try {
    return await write(client, "cancel", [id]);
  } catch (err) {
    throw describeWriteError(err);
  }
}

export async function withdrawCredits(client: any) {
  try {
    return await write(client, "withdraw", []);
  } catch (err) {
    throw describeWriteError(err);
  }
}
