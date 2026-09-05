"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useGenLayer } from "@/components/GenLayerProvider";
import { listBacks, type BackRecord } from "@/lib/contract";
import { formatGen, hostOf, shortAddr, shortId } from "@/lib/format";
import { EmptyState, ErrorState, LoadingState } from "@/components/EmptyState";
import { StateChip } from "@/components/StateChip";

export default function BrowsePage() {
  const { client } = useGenLayer();
  const [rows, setRows] = useState<BackRecord[]>([]);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("ALL");
  const [state, setState] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;
    let live = true;
    setLoading(true);
    listBacks(client)
      .then((r) => {
        if (live) setRows(r);
      })
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "Failed to read backs"))
      .finally(() => setLoading(false));
    return () => {
      live = false;
    };
  }, [client]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (kind !== "ALL" && r.kind !== kind) return false;
      if (state !== "ALL" && r.state !== state) return false;
      const blob = `${r.claim} ${r.source_url} ${r.id}`.toLowerCase();
      if (q && !blob.includes(q.toLowerCase())) return false;
      return true;
    });
  }, [rows, q, kind, state]);

  const locked = rows.filter((r) => r.state === "OPEN").reduce((a, r) => a + BigInt(r.amount || 0), BigInt(0));
  const featured = filtered[0];

  return (
    <div className="flex flex-col w-full">
      <section className="w-full bg-surface py-space-3xl px-gutter-desktop">
        <div className="max-w-content-max-width mx-auto flex flex-col gap-space-2xl">
          <div className="flex flex-col items-center text-center gap-space-md">
            <div className="inline-flex items-center gap-space-xs px-space-md py-space-2xs rounded-full bg-surface-container font-label-mono-sm text-label-mono-sm uppercase">
              <span className="w-2 h-2 rounded-full bg-secondary-container" />
              GenLayer Live-Web Consensus Feed
            </div>
            <h1 className="font-display-hero text-display-hero uppercase leading-none">
              LIVE CLAIMS.
              <br />
              INSTANT PROOF.
            </h1>
            <div className="flex flex-wrap justify-center gap-space-md font-label-mono-sm text-label-mono-sm">
              <span className="px-space-md py-space-xs bg-surface-container rounded-full">
                ACTIVE POOL: {formatGen(locked)} GEN
              </span>
              <span className="px-space-md py-space-xs bg-surface-container rounded-full">
                {rows.length} BACKS ON CONTRACT
              </span>
            </div>
          </div>
          {featured && (
            <Link href={`/claim/${featured.id}`} className="block bg-primary text-on-primary rounded-xl p-space-xl">
              <div className="flex justify-between gap-space-sm flex-wrap">
                <span className="font-label-mono-sm">ID {shortId(featured.id)}</span>
                <StateChip state={featured.state} />
              </div>
              <p className="font-headline-md text-headline-md mt-space-md">{featured.claim}</p>
              <div className="font-label-mono-sm text-primary-fixed-dim mt-space-sm">
                {hostOf(featured.source_url)} · {formatGen(featured.amount)} GEN · {featured.kind}
              </div>
            </Link>
          )}
        </div>
      </section>

      <section className="w-full bg-surface-container-low py-space-xl px-gutter-desktop">
        <div className="max-w-content-max-width mx-auto flex flex-col gap-space-md">
          <input
            className="w-full px-space-lg py-space-sm rounded-full bg-surface-container-lowest"
            placeholder="Search claim, URL, or id hash"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="flex flex-wrap gap-space-xs">
            {["ALL", "OPEN", "TRUE", "FALSE", "THIN", "CANCELED"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setState(s)}
                className={`px-space-md py-space-2xs rounded-full font-label-mono-sm ${state === s ? "bg-primary text-on-primary" : "bg-surface-container"}`}
              >
                {s}
              </button>
            ))}
            {["ALL", "FACT", "LISTING", "PRESS", "JOB", "STATUS", "OTHER"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setKind(s)}
                className={`px-space-md py-space-2xs rounded-full font-label-mono-sm ${kind === s ? "bg-secondary-container" : "bg-surface-container"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full py-space-2xl px-gutter-desktop pb-space-4xl">
        <div className="max-w-content-max-width mx-auto flex flex-col gap-space-md">
          {loading && <LoadingState />}
          {err && <ErrorState message={err} />}
          {!loading && !err && filtered.length === 0 && (
            <EmptyState title="No backs yet" body="Post a claim bond. IDs are hashes from the contract, not CASE numbers." />
          )}
          {filtered.map((r) => (
            <Link
              key={r.id}
              href={`/claim/${r.id}`}
              className="p-space-md bg-surface-container-lowest rounded-xl flex items-center justify-between gap-space-md"
            >
              <div className="min-w-0">
                <div className="flex gap-space-xs items-center mb-space-2xs">
                  <StateChip state={r.state} />
                  <span className="font-label-mono-sm text-on-surface-variant">{r.kind}</span>
                </div>
                <div className="font-body-lg font-bold truncate">{r.claim}</div>
                <div className="font-label-mono-sm text-on-surface-variant truncate">
                  {hostOf(r.source_url)} · {shortAddr(r.poster)} · {shortId(r.id)}
                </div>
              </div>
              <div className="font-badge-numeral font-bold shrink-0">{formatGen(r.amount)} GEN</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
