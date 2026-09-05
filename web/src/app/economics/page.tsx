"use client";

import { useEffect, useState } from "react";
import { useGenLayer } from "@/components/GenLayerProvider";
import { getEconomics, type Economics } from "@/lib/contract";
import { formatGen, shortAddr } from "@/lib/format";
import { CONTRACT_ADDRESS } from "@/lib/chain";
import { ErrorState, LoadingState } from "@/components/EmptyState";

export default function EconomicsPage() {
  const { client } = useGenLayer();
  const [eco, setEco] = useState<Economics | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client) return;
    setLoading(true);
    getEconomics(client)
      .then(setEco)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "failed"))
      .finally(() => setLoading(false));
  }, [client]);

  return (
    <div className="flex flex-col w-full">
      <section className="w-full py-space-3xl px-gutter-desktop">
        <div className="max-w-content-max-width mx-auto flex flex-col gap-space-xl">
          <div className="font-label-mono-sm uppercase text-on-surface-variant">
            GET_ECONOMICS · ON-CHAIN REPOSITORY AUDIT
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl">
            <div className="lg:col-span-8">
              <h1 className="font-headline-xl text-headline-xl uppercase leading-none">
                PROTOCOL ECONOMICS &amp; TREASURY
              </h1>
              <p className="font-body-lg text-on-surface-variant max-w-2xl pt-space-xs">
                Transparent on-chain accounting of locked test GEN, protocol fees, and unspent credit
                liabilities. Numbers come from get_economics(), not a frontend cache.
              </p>
            </div>
            <div className="lg:col-span-4">
              <span className="font-label-mono-sm uppercase text-on-surface-variant">Target contract</span>
              <div className="flex items-center gap-space-xs bg-surface-container p-space-xs rounded-xl">
                <code className="font-badge-numeral">{CONTRACT_ADDRESS ? shortAddr(CONTRACT_ADDRESS) : "unset"}</code>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full bg-surface-container-low py-space-2xl px-gutter-desktop">
        <div className="max-w-content-max-width mx-auto">
          {loading && <LoadingState />}
          {err && <ErrorState message={err} />}
          {eco && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
              <div className="bg-primary text-on-primary p-space-lg rounded-xl">
                <div className="font-label-mono-sm uppercase text-surface-tint">Locked</div>
                <div className="font-headline-lg text-secondary-container">{formatGen(eco.locked)}</div>
                <div className="font-label-mono-sm">GEN IN OPEN BONDS</div>
              </div>
              <div className="bg-secondary-container p-space-lg rounded-xl">
                <div className="font-label-mono-sm uppercase">Treasury</div>
                <div className="font-headline-lg">{formatGen(eco.treasury)}</div>
                <div className="font-label-mono-sm">2.5% OF TRUE SETTLEMENTS</div>
              </div>
              <div className="bg-surface-container-lowest p-space-lg rounded-xl">
                <div className="font-label-mono-sm uppercase">Credits outstanding</div>
                <div className="font-headline-lg">{formatGen(eco.credits)}</div>
                <div className="font-label-mono-sm">WITHDRAW() PULL</div>
              </div>
              <div className="bg-surface-container-high p-space-lg rounded-xl">
                <div className="font-label-mono-sm uppercase">Fee bps</div>
                <div className="font-headline-lg">{eco.fee_bps}</div>
                <div className="font-label-mono-sm">KIND DOES NOT CHANGE THIS</div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="w-full py-space-3xl px-gutter-desktop">
        <div className="max-w-content-max-width mx-auto grid grid-cols-1 md:grid-cols-2 gap-space-lg">
          {[
            ["TRUE", "2.5% stays in contract treasury. Remainder to poster as native transfer, else credits."],
            ["FALSE", "Entire bond to the prover. Dust: integer wei, no extra haircut."],
            ["THIN", "100% refund poster. 404/403/empty/CAPTCHA/5xx never slash."],
            ["CANCELED", "Poster-only while OPEN. 100% refund."],
          ].map(([t, b]) => (
            <div key={t} className="bg-surface-container-lowest p-space-lg rounded-xl">
              <div className="font-headline-md uppercase">{t}</div>
              <p className="font-body-md text-on-surface-variant mt-space-xs">{b}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
