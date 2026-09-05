"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useGenLayer } from "@/components/GenLayerProvider";
import { getCredit, listBacks, withdrawCredits, type BackRecord } from "@/lib/contract";
import { formatGen, hostOf, shortAddr, shortId } from "@/lib/format";
import { EmptyState, ErrorState, LoadingState } from "@/components/EmptyState";
import { StateChip } from "@/components/StateChip";

export default function MePage() {
  const { client, account, connect } = useGenLayer();
  const [rows, setRows] = useState<BackRecord[]>([]);
  const [credit, setCredit] = useState(BigInt(0));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!client || !account) return;
    let live = true;
    setLoading(true);
    Promise.all([listBacks(client), getCredit(client, account)])
      .then(([r, cr]) => {
        if (!live) return;
        setRows(r);
        setCredit(cr);
      })
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "load failed"))
      .finally(() => setLoading(false));
    return () => {
      live = false;
    };
  }, [client, account]);

  const mine = useMemo(() => {
    if (!account) return { backed: [] as BackRecord[], proved: [] as BackRecord[] };
    const a = account.toLowerCase();
    return {
      backed: rows.filter((r) => r.poster.toLowerCase() === a),
      proved: rows.filter((r) => r.prover.toLowerCase() === a),
    };
  }, [rows, account]);

  const locked = mine.backed
    .filter((r) => r.state === "OPEN")
    .reduce((s, r) => s + BigInt(r.amount || 0), BigInt(0));

  async function onWithdraw() {
    if (!client) return;
    setBusy(true);
    setErr(null);
    try {
      await withdrawCredits(client);
      const cr = await getCredit(client, account!);
      setCredit(cr);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "withdraw failed");
    } finally {
      setBusy(false);
    }
  }

  if (!account) {
    return (
      <div className="max-w-content-max-width mx-auto px-gutter-desktop py-space-3xl">
        <h1 className="font-headline-xl text-headline-xl uppercase">MY BACKS</h1>
        <p className="font-body-md mt-space-sm mb-space-lg">Connect a StudioNet wallet to see your backs and credits.</p>
        <button
          className="px-space-xl py-space-sm rounded-full bg-secondary-container font-badge-numeral"
          type="button"
          onClick={connect}
        >
          Connect wallet
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <section className="w-full py-space-3xl px-gutter-desktop">
        <div className="max-w-content-max-width mx-auto flex flex-col gap-space-xl">
          <div className="flex flex-col md:flex-row justify-between gap-space-lg">
            <h1 className="font-headline-xl text-headline-xl uppercase">MY BACKS</h1>
            <div className="flex items-center gap-space-xs bg-surface-container-high p-space-xs rounded-full">
              <span className="px-space-sm py-space-2xs rounded-full bg-surface-container-lowest font-badge-numeral">
                {shortAddr(account)}
              </span>
              <span className="px-space-sm py-space-2xs rounded-full bg-primary text-on-primary font-label-mono-sm">
                STUDIONET
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
            <div className="bg-surface-container-lowest p-space-lg rounded-xl">
              <div className="font-label-mono-sm uppercase text-on-surface-variant">Active claims backed</div>
              <div className="font-headline-lg uppercase">{mine.backed.filter((r) => r.state === "OPEN").length} CLAIMS</div>
              <div className="font-label-mono-sm text-secondary font-bold">{formatGen(locked)} GEN LOCKED</div>
            </div>
            <div className="bg-surface-container-lowest p-space-lg rounded-xl">
              <div className="font-label-mono-sm uppercase text-on-surface-variant">Claims proved by me</div>
              <div className="font-headline-lg uppercase">{mine.proved.length} CLAIMS</div>
            </div>
            <div className="bg-primary text-on-primary p-space-lg rounded-xl" id="withdrawable-vault">
              <div className="font-label-mono-sm uppercase text-on-primary-container">Withdrawable credits</div>
              <div className="font-headline-lg text-secondary-container uppercase">{formatGen(credit)} GEN</div>
              <button
                className="mt-space-sm font-label-mono-sm text-secondary-container underline disabled:no-underline"
                type="button"
                disabled={busy || credit === BigInt(0)}
                onClick={onWithdraw}
              >
                {busy ? "Withdrawing…" : "Withdraw credits"}
              </button>
            </div>
          </div>
          {err && <ErrorState message={err} />}
          {loading && <LoadingState />}
        </div>
      </section>

      <section className="w-full bg-surface-container-low py-space-3xl px-gutter-desktop">
        <div className="max-w-content-max-width mx-auto flex flex-col gap-space-lg">
          <h2 className="font-headline-lg uppercase">Open claims I backed</h2>
          {mine.backed.filter((r) => r.state === "OPEN").length === 0 && (
            <EmptyState title="None open" body="When you lock a bond it appears here from contract storage." />
          )}
          {mine.backed
            .filter((r) => r.state === "OPEN")
            .map((r) => (
              <Link key={r.id} href={`/claim/${r.id}`} className="bg-surface-container-lowest p-space-lg rounded-xl">
                <StateChip state={r.state} />
                <h3 className="font-headline-md mt-space-xs">{r.claim}</h3>
                <div className="font-label-mono-sm">
                  {hostOf(r.source_url)} · {formatGen(r.amount)} GEN · {shortId(r.id)}
                </div>
              </Link>
            ))}
        </div>
      </section>

      <section className="w-full py-space-3xl px-gutter-desktop">
        <div className="max-w-content-max-width mx-auto flex flex-col gap-space-lg">
          <h2 className="font-headline-lg uppercase">Settled</h2>
          {mine.backed.filter((r) => r.state !== "OPEN").length === 0 && mine.proved.length === 0 && (
            <EmptyState title="No settled backs" body="TRUE / FALSE / THIN / CANCELED rows reconstruct from storage." />
          )}
          {[...mine.backed, ...mine.proved]
            .filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i && r.state !== "OPEN")
            .map((r) => (
              <Link key={r.id} href={`/claim/${r.id}`} className="bg-surface-container-lowest p-space-lg rounded-xl">
                <StateChip state={r.state} />
                <h3 className="font-headline-md mt-space-xs">{r.claim}</h3>
                <div className="font-label-mono-sm">{shortId(r.id)}</div>
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
