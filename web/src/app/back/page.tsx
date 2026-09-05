"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useGenLayer } from "@/components/GenLayerProvider";
import { backClaim } from "@/lib/contract";
import { formatGen, hostOf, parseGen } from "@/lib/format";
import { ErrorState } from "@/components/EmptyState";

const KINDS = ["FACT", "LISTING", "PRESS", "JOB", "STATUS", "OTHER"] as const;

export default function BackPage() {
  const router = useRouter();
  const { client, account, connect, wrongNetwork } = useGenLayer();
  const [step, setStep] = useState(1);
  const [claim, setClaim] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<(typeof KINDS)[number]>("FACT");
  const [bond, setBond] = useState("10");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const host = useMemo(() => (url.startsWith("https://") ? hostOf(url) : "—"), [url]);
  const wei = useMemo(() => {
    try {
      return parseGen(bond);
    } catch {
      return BigInt(0);
    }
  }, [bond]);
  const fee = (wei * BigInt(250)) / BigInt(10000);
  const rest = wei > fee ? wei - fee : BigInt(0);

  async function lock() {
    setErr(null);
    if (!account) {
      await connect();
      return;
    }
    if (wrongNetwork) {
      setErr("Switch wallet to GenLayer StudioNet (chain 61999).");
      return;
    }
    if (!client) {
      setErr("Wallet client not ready.");
      return;
    }
    if (claim.trim().length === 0 || claim.length > 280) {
      setErr("Claim must be 1–280 characters.");
      return;
    }
    if (!url.toLowerCase().startsWith("https://") || url.length > 512) {
      setErr("URL must be https:// and at most 512 characters.");
      return;
    }
    if (wei <= BigInt(0)) {
      setErr("Bond must be greater than 0 test GEN.");
      return;
    }
    setBusy(true);
    try {
      const { id } = await backClaim(client, claim.trim(), url.trim(), kind, wei);
      router.push(`/claim/${id}`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "back() failed");
    } finally {
      setBusy(false);
    }
  }

  function tabCls(n: number) {
    return n === step
      ? "flex items-center gap-space-sm p-space-sm rounded-xl bg-primary text-on-primary shadow-[0_4px_0_#1b1c19] text-left"
      : "flex items-center gap-space-sm p-space-sm rounded-xl bg-surface-container-high text-on-surface text-left";
  }

  return (
    <div className="flex flex-col w-full">
      <section className="w-full bg-surface pt-space-2xl pb-space-xl">
        <div className="max-w-content-max-width mx-auto px-gutter-desktop flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-space-xs px-space-md py-space-2xs rounded-full bg-surface-container font-label-mono-sm text-label-mono-sm uppercase mb-space-md">
            <span className="w-2 h-2 rounded-full bg-secondary-container" />
            StudioNet Protocol · Deterministic Web Consensus
          </div>
          <h1 className="font-headline-xl text-headline-xl uppercase tracking-tight text-primary max-w-4xl">
            BACK A CLAIM. PUT UP OR SHUT UP.
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mt-space-sm">
            Lock test GEN behind a single verifiable sentence and an official HTTPS URL. The contract
            assigns the id. The UI never remaps it.
          </p>
          <div className="w-full max-w-3xl mt-space-2xl grid grid-cols-2 md:grid-cols-4 gap-space-sm">
            {[
              [1, "The Sentence"],
              [2, "The Source"],
              [3, "Bond Amount"],
              [4, "Review & Lock"],
            ].map(([n, label]) => (
              <button key={String(n)} className={tabCls(Number(n))} type="button" onClick={() => setStep(Number(n))}>
                <span className="w-7 h-7 rounded-full bg-secondary-container text-on-secondary-fixed font-badge-numeral text-badge-numeral flex items-center justify-center shrink-0">
                  {String(n).padStart(2, "0")}
                </span>
                <span className="font-headline-md text-body-md font-bold truncate">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full bg-surface pb-space-4xl">
        <div className="max-w-content-max-width mx-auto px-gutter-desktop grid grid-cols-1 lg:grid-cols-12 gap-space-xl">
          <div className="lg:col-span-7 flex flex-col gap-space-lg">
            {step === 1 && (
              <div className="bg-surface-container-lowest p-space-xl rounded-xl shadow-md flex flex-col gap-space-md">
                <div className="flex items-center justify-between">
                  <span className="font-headline-lg text-headline-md uppercase">The Sentence</span>
                  <span className="font-label-mono-sm text-label-mono-sm bg-surface-container px-space-xs py-space-2xs rounded-full">
                    {claim.length} / 280
                  </span>
                </div>
                <textarea
                  className="w-full p-space-md bg-surface-container-low rounded-xl text-primary font-body-lg resize-none"
                  maxLength={280}
                  rows={3}
                  value={claim}
                  onChange={(e) => setClaim(e.target.value)}
                  placeholder="e.g. Stripe has officially enabled crypto payouts on mainnet."
                />
                <div className="flex flex-wrap gap-space-xs">
                  {KINDS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKind(k)}
                      className={
                        kind === k
                          ? "px-space-md py-space-xs rounded-full bg-primary text-on-primary font-label-mono-sm text-label-mono-sm"
                          : "px-space-md py-space-xs rounded-full bg-surface-container font-label-mono-sm text-label-mono-sm"
                      }
                    >
                      {k}
                    </button>
                  ))}
                </div>
                <p className="font-body-sm text-body-sm text-surface-tint">Kind does not change payout math</p>
                <div className="flex justify-end">
                  <button
                    className="px-space-xl py-space-xs rounded-full bg-primary text-on-primary font-badge-numeral"
                    type="button"
                    onClick={() => setStep(2)}
                  >
                    Next: Target Source
                  </button>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="bg-surface-container-lowest p-space-xl rounded-xl shadow-md flex flex-col gap-space-md">
                <span className="font-headline-lg text-headline-md uppercase">The Source</span>
                <input
                  className="w-full px-space-md py-space-sm bg-surface-container-low rounded-xl"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/announcement"
                />
                <div className="font-label-mono-sm text-label-mono-sm text-surface-tint">
                  Must start with https:// · no javascript: · max 512 chars
                </div>
                <div className="p-space-md rounded-xl bg-surface-container font-badge-numeral">
                  Hostname: {host}
                </div>
                <div className="flex justify-between">
                  <button type="button" onClick={() => setStep(1)}>
                    ← Back
                  </button>
                  <button
                    className="px-space-xl py-space-xs rounded-full bg-primary text-on-primary font-badge-numeral"
                    type="button"
                    onClick={() => setStep(3)}
                  >
                    Next: Bond Amount
                  </button>
                </div>
              </div>
            )}
            {step === 3 && (
              <div className="bg-surface-container-lowest p-space-xl rounded-xl shadow-md flex flex-col gap-space-md">
                <span className="font-headline-lg text-headline-md uppercase">Bond Amount</span>
                <input
                  className="w-full px-space-md py-space-sm bg-surface-container-low rounded-xl font-badge-numeral"
                  value={bond}
                  onChange={(e) => setBond(e.target.value)}
                />
                <p className="font-body-md text-on-surface-variant">
                  StudioNet test GEN. No real value. TRUE takes 2.5% to treasury.
                </p>
                <div className="flex justify-between">
                  <button type="button" onClick={() => setStep(2)}>
                    ← Back
                  </button>
                  <button
                    className="px-space-xl py-space-xs rounded-full bg-primary text-on-primary font-badge-numeral"
                    type="button"
                    onClick={() => setStep(4)}
                  >
                    Next: Review
                  </button>
                </div>
              </div>
            )}
            {step === 4 && (
              <div className="bg-surface-container-lowest p-space-xl rounded-xl shadow-md flex flex-col gap-space-md">
                <span className="font-headline-lg text-headline-md uppercase">Review &amp; Lock</span>
                <p className="font-body-lg">{claim || "—"}</p>
                <p className="font-label-mono-sm break-all">{url || "—"}</p>
                <p className="font-badge-numeral">
                  {kind} · {bond} GEN
                </p>
                {err && <ErrorState message={err} />}
                <div className="flex justify-between">
                  <button type="button" onClick={() => setStep(3)}>
                    ← Back
                  </button>
                  <button
                    className="px-space-xl py-space-sm rounded-full bg-secondary-container text-on-secondary-fixed font-badge-numeral shadow-[0_4px_0px_#000000] disabled:opacity-50"
                    type="button"
                    disabled={busy}
                    onClick={lock}
                  >
                    {busy ? "LOCKING…" : account ? "LOCK BOND" : "CONNECT & LOCK"}
                  </button>
                </div>
              </div>
            )}
          </div>
          <aside className="lg:col-span-5 bg-primary text-on-primary p-space-xl rounded-xl h-fit">
            <div className="font-label-mono-sm text-secondary-container uppercase mb-space-sm">Payout preview</div>
            <div className="font-headline-md text-headline-md uppercase mb-space-md">If TRUE</div>
            <p className="font-body-md text-on-primary-container">
              Treasury {formatGen(fee)} GEN (2.5%). Poster remainder {formatGen(rest)} GEN.
            </p>
            <div className="font-headline-md text-headline-md uppercase mt-space-lg mb-space-xs">If FALSE</div>
            <p className="font-body-md text-on-primary-container">Entire bond to prover.</p>
            <div className="font-headline-md text-headline-md uppercase mt-space-lg mb-space-xs">If THIN / CANCELED</div>
            <p className="font-body-md text-on-primary-container">100% refund poster.</p>
          </aside>
        </div>
      </section>
    </div>
  );
}
