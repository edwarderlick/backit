"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useGenLayer } from "@/components/GenLayerProvider";
import { cancelBack, getBack, proveBack, type BackRecord } from "@/lib/contract";
import { formatGen, hostOf, shortAddr, shortId } from "@/lib/format";
import { isContractId } from "@/lib/ids";
import { EmptyState, ErrorState, LoadingState } from "@/components/EmptyState";
import { StateChip } from "@/components/StateChip";

export default function ClaimPage() {
  const { id } = useParams<{ id: string }>();
  const { client, account, connect, wrongNetwork } = useGenLayer();
  const [rec, setRec] = useState<BackRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<"prove" | "cancel" | null>(null);
  const [confirmProve, setConfirmProve] = useState(false);

  async function reload() {
    if (!client || !id) return;
    const row = await getBack(client, id);
    setRec(row);
  }

  useEffect(() => {
    if (!client || !id) return;
    if (!isContractId(id)) {
      setErr("This is not a contract id. BackIt never uses CASE counters.");
      setLoading(false);
      return;
    }
    setLoading(true);
    getBack(client, id)
      .then(setRec)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "Not found"))
      .finally(() => setLoading(false));
  }, [client, id]);

  const isPoster =
    account && rec && account.toLowerCase() === rec.poster.toLowerCase();
  const open = rec?.state === "OPEN";

  async function onProve() {
    if (!account) {
      await connect();
      return;
    }
    if (!client || !id) return;
    if (wrongNetwork) {
      setErr("Switch to StudioNet chain 61999.");
      return;
    }
    setBusy("prove");
    setErr(null);
    try {
      await proveBack(client, id);
      await reload();
      setConfirmProve(false);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "prove() failed");
    } finally {
      setBusy(null);
    }
  }

  async function onCancel() {
    if (!client || !id) return;
    setBusy("cancel");
    setErr(null);
    try {
      await cancelBack(client, id);
      await reload();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "cancel() failed");
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
        <ErrorState message={err} />
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
                Any connected wallet can call prove now. The contract fetches the live HTTPS page and
                settles immediately.
              </p>
            </div>
            <div className="flex flex-wrap gap-space-md">
              <button
                className="px-space-xl py-space-md rounded-full bg-secondary-container text-on-secondary-fixed font-headline-md uppercase shadow-[0_4px_0px_#ffffff]"
                type="button"
                onClick={() => setConfirmProve(true)}
              >
                Prove this claim
              </button>
              {isPoster && (
                <button
                  className="px-space-lg py-space-md rounded-full bg-primary-container text-on-primary"
                  type="button"
                  disabled={busy === "cancel"}
                  onClick={onCancel}
                >
                  {busy === "cancel" ? "Canceling…" : "Cancel backing"}
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="w-full bg-surface py-space-3xl">
        <div className="max-w-content-max-width mx-auto px-gutter-desktop grid grid-cols-1 lg:grid-cols-12 gap-space-xl">
          <div className="lg:col-span-7 bg-surface-container-lowest p-space-xl rounded-2xl flex flex-col gap-space-md">
            <span className="font-headline-md uppercase">Source board</span>
            <a className="font-badge-numeral break-all text-primary" href={rec.source_url} target="_blank" rel="noreferrer">
              {rec.source_url}
            </a>
            <div className="font-label-mono-sm">{hostOf(rec.source_url)}</div>
          </div>
          <div className="lg:col-span-5 bg-surface-container-low p-space-xl rounded-2xl flex flex-col gap-space-sm">
            <span className="font-headline-md uppercase">Settlement from storage</span>
            <p className="font-body-md">Fee paid: {formatGen(rec.fee_paid)} GEN</p>
            <p className="font-body-md">Paid poster: {formatGen(rec.paid_to_poster)} GEN</p>
            <p className="font-body-md">Paid prover: {formatGen(rec.paid_to_prover)} GEN</p>
            <p className="font-body-md">Credits poster: {formatGen(rec.credit_poster)} GEN</p>
            <p className="font-body-md">Credits prover: {formatGen(rec.credit_prover)} GEN</p>
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
              This calls prove() on-chain. Validators fetch the live page. You do not write the
              verdict.
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
                {busy === "prove" ? "Proving…" : "Execute prove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
