"use client";

import type { TrackedStatus, TransactionKit } from "@genlayer/transaction-kit";
import { CONTRACT_ADDRESS } from "./chain";
import { diffNewIds } from "./ids";
import { toWei } from "./format";
import { extractReturnedId } from "./genlayer";

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
  final_url: string;
  content_hash: string;
};

export type Economics = {
  treasury: string;
  locked: string;
  credits: string;
  fee_bps: string;
  prover_bps: string;
  cancel_bps: string;
  count: string;
  feed_max: string;
};

type WriteResult = { hash: `0x${string}`; status: TrackedStatus; receipt: unknown };

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
    final_url: s("final_url"),
    content_hash: s("content_hash"),
  };
}

export async function listIds(client: any): Promise<string[]> {
  const ids = await withStudioRetry(() =>
    client.readContract({
      address: requireAddress(),
      functionName: "list_ids",
      args: [],
    }),
  );
  return Array.isArray(ids) ? ids.map((x: unknown) => String(x)) : [];
}

export async function getBack(client: any, id: string): Promise<BackRecord> {
  const raw = await withStudioRetry(() =>
    client.readContract({
      address: requireAddress(),
      functionName: "get_back",
      args: [id],
    }),
  );
  return asRecord(raw);
}

export async function getEconomics(client: any): Promise<Economics> {
  const raw = (await withStudioRetry(() =>
    client.readContract({
      address: requireAddress(),
      functionName: "get_economics",
      args: [],
    }),
  )) as Record<string, unknown>;
  return {
    treasury: String(raw?.treasury ?? 0),
    locked: String(raw?.locked ?? 0),
    credits: String(raw?.credits ?? 0),
    fee_bps: String(raw?.fee_bps ?? 250),
    prover_bps: String(raw?.prover_bps ?? 1000),
    cancel_bps: String(raw?.cancel_bps ?? 1000),
    count: String(raw?.count ?? 0),
    feed_max: String(raw?.feed_max ?? 20),
  };
}

export async function getFeed(client: any, offset = 0, limit = 20): Promise<BackRecord[]> {
  const raw = await withStudioRetry(() =>
    client.readContract({
      address: requireAddress(),
      functionName: "get_feed",
      args: [offset, limit],
    }),
  );
  return Array.isArray(raw) ? raw.map((row) => asRecord(row)) : [];
}

/** A few newest-first pages. Stops early so a personal view cannot walk the whole contract. */
export async function listRecent(client: any, pages = 5): Promise<BackRecord[]> {
  const out: BackRecord[] = [];
  for (let i = 0; i < pages; i++) {
    const page = await getFeed(client, i * 20, 20);
    out.push(...page);
    if (page.length < 20) break;
  }
  return out;
}

export async function getCredit(client: any, addr: string): Promise<bigint> {
  const raw = await withStudioRetry(() =>
    client.readContract({
      address: requireAddress(),
      functionName: "get_credit",
      args: [addr],
    }),
  );
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
  const seen = new Set<unknown>();
  const walk = (value: unknown): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (typeof value !== "object" || seen.has(value)) return "";
    seen.add(value);
    const obj = value as Record<string, unknown>;
    const parts = [
      obj.message,
      obj.details,
      obj.shortMessage,
      obj.txExecutionResultName,
      obj.executionResultName,
      obj.result_name,
      obj.statusName,
      obj.status,
      obj.payload,
      obj.error_description,
      obj.last_round,
      obj.data,
      obj.result,
      obj.consensus_data,
      obj.cause,
    ]
      .map(walk)
      .filter(Boolean);
    return parts.join(" ");
  };
  if (err instanceof Error) return `${err.message} ${walk((err as { cause?: unknown }).cause)}`;
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
      "Studio Next is busy right now. If MetaMask opened and you confirmed, check MetaMask Activity before trying again.",
    );
  }
  return err instanceof Error ? err : new Error(String(err));
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(err: unknown, attempt: number): number {
  const text = rpcText(err);
  const retryAfter = text.match(/retry_after_seconds["':\s]+(\d+)/i) || text.match(/retry later.*?(\d+)/i);
  if (retryAfter) return Math.min(10_000, Math.max(1000, Number(retryAfter[1]) * 1000));
  return Math.min(10_000, 1000 * 2 ** attempt);
}

async function withStudioRetry<T>(fn: () => Promise<T>, attempts = 6): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (!isStudioRpcBlip(err) || i === attempts - 1) break;
      await delay(retryDelayMs(err, i));
    }
  }
  throw last;
}

function hasExecutionError(status: TrackedStatus): boolean {
  const text = rpcText(status);
  if (/FINISHED_WITH_ERROR|MAJORITY_DISAGREE|rollback|Leader execution failed|execution failed/i.test(text)) return true;
  if (status.successful === false) return true;
  return false;
}

function findGenVmDetail(value: unknown): string {
  const seen = new Set<unknown>();
  const walk = (v: unknown): string => {
    if (!v || typeof v !== "object" || seen.has(v)) return "";
    seen.add(v);
    const obj = v as Record<string, unknown>;
    if (typeof obj.stderr === "string" && obj.stderr.trim()) return `\nStderr: ${obj.stderr}`;
    if (typeof obj.payload === "string" && obj.payload.trim()) return `\nResult payload: ${obj.payload}`;
    if (typeof obj.txExecutionResultName === "string" && obj.txExecutionResultName.trim()) {
      return `\nExecution: ${obj.txExecutionResultName}`;
    }
    if (typeof obj.error_description === "string" && obj.error_description.trim()) {
      return `\nError: ${obj.error_description}`;
    }
    for (const child of Object.values(obj)) {
      const found = walk(child);
      if (found) return found;
    }
    return "";
  };
  return walk(value);
}

function assertNoReceiptError(receipt: unknown): void {
  const text = rpcText(receipt);
  if (!/FINISHED_WITH_ERROR|MAJORITY_DISAGREE|rollback|Leader execution failed|execution failed/i.test(text)) return;
  const detail = findGenVmDetail(receipt);
  throw new Error(`Studio Next execution failed${detail}`);
}

async function write(
  kit: TransactionKit,
  functionName: string,
  args: unknown[],
  value?: bigint,
): Promise<WriteResult> {
  const tx = {
    kind: "write" as const,
    address: requireAddress(),
    method: functionName,
    args,
  };
  const quote = await withStudioRetry(() => kit.estimate(value !== undefined ? { userValue: value } : {}, tx), 8);
  const submitted = await kit.submit(quote, tx);
  const status = await kit.track(submitted.genlayerTxId, () => {}, { until: "finalized" });
  try {
    assertNoReceiptError(status);
  } catch (err) {
    const hash = (status.evmTxHash || submitted.genlayerTxId) as `0x${string}`;
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`${message}\nTx: ${hash}`);
  }
  if (hasExecutionError(status)) {
    const name = status.statusName || "unknown";
    const exec = status.executionResultName || "";
    const detail = findGenVmDetail(status);
    throw new Error(`Studio Next execution failed: ${name} ${exec}${detail}`.trim());
  }
  const hash = (status.evmTxHash || submitted.genlayerTxId) as `0x${string}`;
  return { hash, status, receipt: status };
}

export async function backClaim(
  kit: TransactionKit,
  client: any,
  claim: string,
  sourceUrl: string,
  kind: string,
  valueWei: bigint,
): Promise<{ id: string; tx: `0x${string}` }> {
  const before = await listIds(client);
  try {
    const { hash, status, receipt } = await write(kit, "back", [claim, sourceUrl, kind], valueWei);
    const fromReceipt = extractReturnedId(receipt) || extractReturnedId(status);
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
    const hashFromErr = extractTxHash(err);
    if (!hashFromErr && !isStudioRpcBlip(err)) throw describeWriteError(err);
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

/** Single fee-bearing write for the prove action. */
export async function proveBack(kit: TransactionKit, id: string) {
  try {
    return await write(kit, "prove", [id]);
  } catch (err) {
    throw describeWriteError(err);
  }
}

export async function cancelBack(kit: TransactionKit, id: string) {
  try {
    return await write(kit, "cancel", [id]);
  } catch (err) {
    throw describeWriteError(err);
  }
}

export async function withdrawCredits(kit: TransactionKit) {
  try {
    return await write(kit, "withdraw", []);
  } catch (err) {
    throw describeWriteError(err);
  }
}
