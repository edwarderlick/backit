"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CONTRACT_ADDRESS, EXPLORER_URL } from "@/lib/chain";
import { useGenLayer } from "@/components/GenLayerProvider";
import { cancelBack, getBack, getCredit, proveBack, withdrawCredits, type BackRecord } from "@/lib/contract";
import { formatGen, hostOf, shortAddr, shortId, toWei } from "@/lib/format";
import { isContractId } from "@/lib/ids";
import { EmptyState, ErrorState, LoadingState } from "@/components/EmptyState";
import { StateChip } from "@/components/StateChip";

export default function ClaimPage() {
  const { id } = useParams<{ id: string }>();
  const { client, kit, account, connect, wrongNetwork } = useGenLayer();
  const [rec, setRec] = useState<BackRecord | null>(null);
  const [credit, setCredit] = useState(BigInt(0));
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<"prove" | "cancel" | "withdraw" | null>(null);
  const [confirmProve, setConfirmProve] = useState(false);
  const [latestTx, setLatestTx] = useState<`0x${string}` | null>(null);
  const [nowSeconds, setNowSeconds] = useState(() => Math.floor(Date.now() / 1000));

  async function reload() {
    if (!client || !id) return;
    const next = await getBack(client, id);
    setRec(next);
    if (account) {
      setCredit(await getCredit(client, account));
    }
    return next;
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNowSeconds(Math.floor(Date.now() / 1000)), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!CONTRACT_ADDRESS) {
      setErr("Contract address is not set for this deployment.");
      setLoading(false);
      return;
    }
    if (!client || !id) return;
    if (!isContractId(id)) {
      setErr("This is not a contract id. BackIt never uses CASE counters.");
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([getBack(client, id), account ? getCredit(client, account) : Promise.resolve(BigInt(0))])
      .then(([next, nextCredit]) => {
        setRec(next);
        setCredit(nextCredit);
      })
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "Not found"))
      .finally(() => setLoading(false));
  }, [account, client, id]);

  const isPoster = Boolean(account && rec && account.toLowerCase() === rec.poster.toLowerCase());
  const open = rec?.state === "OPEN";
  const createdSeconds = Number(rec?.created_at || 0);
  const cancelReady = open && createdSeconds > 0 && nowSeconds >= createdSeconds + 600;

  async function onProve() {
    if (!account) {
      await connect();
      return;
    }
    if (!kit || !id) return;
    if (wrongNetwork) {
      setErr("Switch to Studio Next chain 61997.");
      return;
    }
    setBusy("prove");
    setErr(null);
    try {
      const { hash } = await proveBack(kit, id);
      setLatestTx(hash);
      const next = await reload();
      if (next?.state === "OPEN") throw new Error(`prove() finalized but claim is still OPEN.\nTx: ${hash}`);
      setConfirmProve(false);
    } catch (e: unknown) {
      noteTxFromError(e);
      setConfirmProve(false);
      setErr(e instanceof Error ? e.message : "prove() failed");
      await reload();
    } finally {
      setBusy(null);
    }
  }

  function noteTxFromError(error: unknown) {
    const text = error instanceof Error ? error.message : String(error);
    const match = text.match(/0x[a-fA-F0-9]{64}/);
    if (match) setLatestTx(match[0] as `0x${string}`);
  }

  async function onCancel() {
    if (!kit || !id) return;
    if (!cancelReady) {
      setErr("Cancel is available after the 10-minute commitment window.");
      return;
    }
    setBusy("cancel");
    setErr(null);
    try {
      const beforeCredit = credit;
      const { hash } = await cancelBack(kit, id);
      setLatestTx(hash);
      const next = await reload();
      if (next?.state !== "CANCELED") {
        throw new Error(`cancel() finalized but claim status is ${next?.state || "unknown"}.\nTx: ${hash}`);
      }
      const refund = toWei(next.amount) - (toWei(next.amount) * BigInt(1000)) / BigInt(10000);
      const paid = toWei(next.paid_to_poster);
      const credited = toWei(next.credit_poster);
      const afterCredit = account && client ? await getCredit(client, account) : credit;
      setCredit(afterCredit);
      if (paid !== refund && credited !== refund && afterCredit - beforeCredit !== refund) {
        throw new Error(`cancel() did not expose the expected 90% refund.\nTx: ${hash}`);
      }
    } catch (e: unknown) {
      noteTxFromError(e);
      setErr(e instanceof Error ? e.message : "cancel() failed");
      await reload();
    } finally {
      setBusy(null);
    }
  }

  async function onWithdraw() {
    if (!account) {
      await connect();
      return;
    }
    if (!kit || !client) return;
    if (wrongNetwork) {
      setErr("Switch to Studio Next chain 61997.");
      return;
    }
    setBusy("withdraw");
    setErr(null);
    try {
      const { hash } = await withdrawCredits(kit);
      setLatestTx(hash);
      setCredit(await getCredit(client, account));
    } catch (e: unknown) {
      noteTxFromError(e);
      setErr(e instanceof Error ? e.message : "withdraw() failed");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-content-max-width mx-auto px-gutter-desktop py-space-2xl">
        <LoadingState />
      </div>
    );
  }
  if (err && !rec) {
    return (
      <div className="max-w-content-max-width mx-auto px-gutter-desktop py-space-2xl">
        <div className="bg-surface-container-lowest p-space-xl rounded-2xl flex flex-col gap-space-md">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-[28px] text-secondary">history</span>
            <h1 className="font-headline-lg text-headline-lg uppercase">Claim not on this contract</h1>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">
            This claim id was not found in the current BackIt deployment. It may belong to an older
            contract from a previous Studio Next redeploy. New claims should be opened from the
            current browse feed.
          </p>
          <div className="font-label-mono-sm text-label-mono-sm text-on-surface-variant break-all">
            Current contract: {CONTRACT_ADDRESS ? shortAddr(CONTRACT_ADDRESS) : "not deployed"}
          </div>
          <div className="flex flex-wrap gap-space-sm">
            <Link
              href="/browse"
              className="inline-flex items-center gap-space-xs px-space-lg py-space-sm rounded-full bg-primary text-on-primary font-badge-numeral"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Browse current claims
            </Link>
            {CONTRACT_ADDRESS && (
              <a
                className="inline-flex items-center gap-space-xs px-space-lg py-space-sm rounded-full bg-surface-container font-badge-numeral"
                href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                View contract
              </a>
            )}
          </div>
          <details className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">
            <summary>Read error</summary>
            <div className="mt-space-xs break-all">{err}</div>
          </details>
        </div>
      </div>
    );
  }
  if (!rec) {
    return (
      <div className="max-w-content-max-width mx-auto px-gutter-desktop py-space-2xl">
        <EmptyState title="Unknown back" body="Id was not found in contract storage." />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <section className="w-full bg-surface-container-low py-space-md">
        <div className="max-w-content-max-width mx-auto px-gutter-desktop flex flex-wrap justify-between gap-space-sm">
          <Link href="/browse" className="inline-flex items-center gap-space-xs font-label-mono-sm uppercase">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Browse
          </Link>
          <div className="font-label-mono-sm">ID {shortId(rec.id)}</div>
        </div>
      </section>

      <section className="w-full bg-surface py-space-2xl">
        <div className="max-w-content-max-width mx-auto px-gutter-desktop flex flex-col gap-space-lg">
          <div className="flex flex-wrap justify-between gap-space-md">
            <div className="flex items-center gap-space-sm">
              <span className="px-space-sm py-space-2xs rounded-full bg-primary text-on-primary font-label-mono-sm">
                {rec.kind}
              </span>
              <span className="font-label-mono-sm text-on-surface-variant">
                Posted by {shortAddr(rec.poster)}
              </span>
            </div>
            <div className="flex items-center gap-space-sm">
              <StateChip state={rec.state} />
              <span className="px-space-md py-space-2xs rounded-full bg-surface-container-highest font-badge-numeral">
                {formatGen(rec.amount)} TEST GEN
              </span>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-space-xl rounded-2xl">
            <span className="font-label-mono-sm text-on-surface-variant uppercase">Target statement</span>
            <h1 className="font-headline-lg text-headline-lg uppercase leading-tight mt-space-sm">{rec.claim}</h1>
          </div>
        </div>
      </section>

      {open && (
        <section className="w-full bg-primary text-on-primary py-space-xl">
          <div className="max-w-content-max-width mx-auto px-gutter-desktop flex flex-col lg:flex-row justify-between gap-space-xl">
            <div>
              <div className="font-label-mono-sm text-secondary-container uppercase font-bold">
                Awaiting proof settlement
              </div>
              <p className="font-body-lg mt-space-2xs">
                Prove sends one fee-bearing write, then validators fetch the live page. TRUE pays the prover 10%.
                Cancel is open only before settlement, and it keeps 10% in the treasury.
              </p>
            </div>
            <div className="flex flex-wrap gap-space-md">
              <button
                className="px-space-xl py-space-md rounded-full bg-secondary-container text-on-secondary-fixed font-headline-md uppercase shadow-[0_4px_0px_#ffffff]"
                type="button"
                onClick={() => setConfirmProve(true)}
              >
                Prove claim
              </button>
              {isPoster && (
                <button
                  className="px-space-lg py-space-md rounded-full bg-primary-container text-on-primary"
                  type="button"
                  disabled={busy === "cancel" || !cancelReady}
                  onClick={onCancel}
                  title={cancelReady ? "Cancel claim" : "Cancel is available after the commitment window."}
                >
                  {busy === "cancel" ? "Canceling..." : cancelReady ? "Cancel (10% slash)" : "Cancel after window"}
                </button>
              )}
              {credit > BigInt(0) && (
                <button
                  className="px-space-lg py-space-md rounded-full bg-surface text-on-surface font-badge-numeral"
                  type="button"
                  disabled={busy === "withdraw"}
                  onClick={onWithdraw}
                >
                  {busy === "withdraw" ? "Withdrawing..." : `Withdraw ${formatGen(credit)} GEN`}
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {!open && credit > BigInt(0) && (
        <section className="w-full bg-primary text-on-primary py-space-lg">
          <div className="max-w-content-max-width mx-auto px-gutter-desktop flex flex-col sm:flex-row justify-between gap-space-md sm:items-center">
            <div>
              <div className="font-label-mono-sm uppercase text-secondary-container">Withdrawable credit</div>
              <div className="font-headline-md uppercase">{formatGen(credit)} GEN</div>
            </div>
            <button
              className="px-space-lg py-space-md rounded-full bg-secondary-container text-on-secondary-fixed font-badge-numeral"
              type="button"
              disabled={busy === "withdraw"}
              onClick={onWithdraw}
            >
              {busy === "withdraw" ? "Withdrawing..." : "Withdraw credits"}
            </button>
          </div>
        </section>
      )}

      <section className="w-full bg-surface py-space-3xl">
        <div className="max-w-content-max-width mx-auto px-gutter-desktop grid grid-cols-1 lg:grid-cols-12 gap-space-xl">
          <div className="lg:col-span-7 bg-surface-container-lowest p-space-xl rounded-2xl flex flex-col gap-space-md">
            <span className="font-headline-md uppercase">Source board</span>
            <a className="font-badge-numeral break-all text-primary" href={rec.final_url || rec.source_url} target="_blank" rel="noreferrer">
              {rec.final_url || rec.source_url}
            </a>
            <div className="font-label-mono-sm">{hostOf(rec.final_url || rec.source_url)}</div>
            {rec.final_url && rec.final_url !== rec.source_url && (
              <div className="font-label-mono-sm break-all">Posted URL {rec.source_url}</div>
            )}
            {rec.content_hash && <div className="font-label-mono-sm break-all">Snapshot {rec.content_hash}</div>}
          </div>
          <div className="lg:col-span-5 bg-surface-container-low p-space-xl rounded-2xl flex flex-col gap-space-sm">
            <span className="font-headline-md uppercase">Settlement from storage</span>
            <p className="font-body-md">Fee paid: {formatGen(rec.fee_paid)} GEN</p>
            <p className="font-body-md">Paid poster: {formatGen(rec.paid_to_poster)} GEN</p>
            <p className="font-body-md">Paid prover: {formatGen(rec.paid_to_prover)} GEN</p>
            <p className="font-body-md">Credits poster: {formatGen(rec.credit_poster)} GEN</p>
            <p className="font-body-md">Credits prover: {formatGen(rec.credit_prover)} GEN</p>
            <p className="font-body-md">Status: {rec.state}</p>
            {latestTx && <p className="font-label-mono-sm break-all">Latest tx {latestTx}</p>}
            {rec.quote && <p className="font-body-sm">Quote: {rec.quote}</p>}
            {rec.reason && <p className="font-body-sm">Reason: {rec.reason}</p>}
            {rec.prover && rec.prover.replace(/0x0+/, "") !== "" && (
              <p className="font-label-mono-sm">Prover {shortAddr(rec.prover)}</p>
            )}
          </div>
        </div>
      </section>

      {err && (
        <div className="max-w-content-max-width mx-auto px-gutter-desktop pb-space-xl">
          <ErrorState message={err} />
        </div>
      )}

      {confirmProve && (
        <div className="fixed inset-0 bg-primary/70 z-[80] flex items-center justify-center p-space-md">
          <div className="bg-surface-container-lowest p-space-xl rounded-2xl max-w-lg w-full flex flex-col gap-space-md">
            <h2 className="font-headline-lg text-headline-md uppercase">Confirm prove</h2>
            <p className="font-body-md text-on-surface-variant">
              This sends prove. It is a fee-bearing write. Validators fetch the
              page themselves and check the quote against that fetch. You do not write the verdict.
            </p>
            <div className="flex gap-space-sm justify-end">
              <button type="button" onClick={() => setConfirmProve(false)}>
                Close
              </button>
              <button
                className="px-space-lg py-space-sm rounded-full bg-primary text-on-primary font-badge-numeral"
                type="button"
                disabled={busy === "prove"}
                onClick={onProve}
              >
                {busy === "prove" ? "Proving..." : "Prove claim"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
