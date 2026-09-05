import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex flex-col w-full">
      <section className="relative w-full overflow-hidden px-gutter-desktop pt-space-xl pb-space-3xl md:pb-space-4xl flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-space-xs px-space-md py-space-2xs rounded-full bg-surface-container font-label-mono-sm text-label-mono-sm uppercase tracking-widest text-on-surface shadow-sm mb-space-lg">
          <span className="w-2 h-2 rounded-full bg-secondary-container" />
          <span>GENLAYER STUDIONET PROTOCOL · SAME-SESSION LIVE-WEB SETTLEMENT</span>
        </div>
        <h1 className="font-display-hero text-display-hero uppercase tracking-tight text-primary max-w-5xl text-balance leading-[0.95] mb-space-lg">
          PUT UP OR SHUT UP.
          <br />
          <span className="text-secondary">LOCK TEST GEN</span> ON WHAT A PUBLIC PAGE SAYS RIGHT NOW.
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl text-balance mb-space-2xl">
          BackIt is an atomic live-web primitive. Back a checkable statement with a single HTTPS URL.
          Anyone can trigger consensus. Settled in one write — no juries, no docket, no appeal window.
          StudioNet test GEN only. No real value.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-space-sm mb-space-3xl">
          <Link
            className="px-space-xl py-space-sm rounded-full bg-secondary-container text-on-secondary-fixed font-headline-md text-body-lg uppercase tracking-tight hover:bg-secondary-fixed transition-all shadow-[0_6px_0px_#000000] flex items-center gap-space-xs"
            href="/back"
          >
            <span>ENTER APP &amp; POST CLAIM</span>
            <span className="material-symbols-outlined text-[20px]">bolt</span>
          </Link>
          <Link
            className="px-space-xl py-space-sm rounded-full bg-surface-container-highest text-primary font-headline-md text-body-lg uppercase tracking-tight"
            href="/how"
          >
            HOW IT WORKS
          </Link>
          <Link
            className="px-space-lg py-space-sm rounded-full text-on-surface-variant hover:text-primary font-body-md text-body-md uppercase tracking-wider flex items-center gap-space-2xs"
            href="/browse"
          >
            <span>EXPLORE LIVE FEED</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>
        <div className="w-full max-w-3xl bg-surface-container-lowest p-space-lg md:p-space-xl rounded-2xl shadow-[0_16px_36px_-8px_rgba(0,0,0,0.08)] text-left flex flex-col gap-space-md">
          <div className="flex flex-wrap items-center justify-between gap-space-xs">
            <span className="px-space-xs py-space-2xs rounded-full bg-secondary-container text-on-secondary-fixed font-label-mono-sm text-label-mono-sm font-bold uppercase">
              SAMPLE CARD · NOT A CONTRACT ID
            </span>
            <span className="px-space-xs py-space-2xs rounded bg-surface-container-high text-primary uppercase font-badge-numeral text-badge-numeral">
              STATE: OPEN
            </span>
          </div>
          <p className="font-headline-lg text-headline-md md:text-headline-lg uppercase text-primary leading-tight">
            “Stripe has officially enabled crypto payouts on mainnet”
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm bg-surface-container-low p-space-md rounded-xl">
            <div>
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant uppercase">
                Canonical source
              </span>
              <div className="font-badge-numeral text-body-md font-bold">stripe.com/newsroom</div>
            </div>
            <div>
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant uppercase">
                Locked bond
              </span>
              <div className="font-badge-numeral text-body-md font-bold">250.00 GEN</div>
            </div>
            <div>
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant uppercase">
                TRUE remainder
              </span>
              <div className="font-badge-numeral text-body-md font-bold text-secondary">97.5% to poster</div>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full bg-surface-container-low py-space-3xl px-gutter-desktop">
        <div className="max-w-content-max-width mx-auto grid grid-cols-1 md:grid-cols-3 gap-space-lg">
          {[
            ["01", "Zero human juries", "Validators fetch the live HTTPS page. Kind is a label. Kind does not change payout math."],
            ["02", "Atomic settlement", "prove() fetches and pays in one write. No keeper. No deadline. No second round."],
            ["03", "Dead page safeguard", "404, 403, CAPTCHA, 5xx, or empty → THIN. 100% refund to the poster."],
          ].map(([n, t, b]) => (
            <div key={n} className="bg-surface-container-lowest p-space-xl rounded-2xl flex flex-col gap-space-md">
              <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-fixed font-badge-numeral text-badge-numeral flex items-center justify-center">
                {n}
              </div>
              <h3 className="font-headline-lg text-headline-md uppercase">{t}</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">{b}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="w-full bg-secondary-container text-on-secondary-fixed py-space-2xl px-gutter-desktop">
        <div className="max-w-content-max-width mx-auto grid grid-cols-2 lg:grid-cols-4 gap-space-xl">
          <div>
            <div className="font-display-hero text-headline-xl uppercase">TRUE</div>
            <div className="font-label-mono-sm text-label-mono-sm uppercase font-bold mt-space-2xs">
              2.5% treasury · 97.5% poster
            </div>
          </div>
          <div>
            <div className="font-display-hero text-headline-xl uppercase">FALSE</div>
            <div className="font-label-mono-sm text-label-mono-sm uppercase font-bold mt-space-2xs">
              100% bond to prover
            </div>
          </div>
          <div>
            <div className="font-display-hero text-headline-xl uppercase">THIN</div>
            <div className="font-label-mono-sm text-label-mono-sm uppercase font-bold mt-space-2xs">
              100% refund poster
            </div>
          </div>
          <div>
            <div className="font-display-hero text-headline-xl uppercase">2.5%</div>
            <div className="font-label-mono-sm text-label-mono-sm uppercase font-bold mt-space-2xs">
              Fixed TRUE protocol fee
            </div>
          </div>
        </div>
      </section>

      <section className="w-full py-space-3xl px-gutter-desktop" id="how-it-works">
        <div className="max-w-content-max-width mx-auto flex flex-col gap-space-2xl">
          <div className="text-center">
            <span className="font-label-mono-sm text-label-mono-sm text-secondary uppercase tracking-widest">
              Live outcome shapes (not listing IDs)
            </span>
            <h2 className="font-headline-xl text-headline-xl uppercase text-primary">WHAT CAN YOU BACK?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
            {[
              ["TRUE", "RFC 791 Internet Protocol was published in September 1981.", "datatracker.ietf.org/doc/html/rfc791", "2.5% treasury · 97.5% poster"],
              ["FALSE", "RFC 791 is dated 2024.", "datatracker.ietf.org/doc/html/rfc791", "100% to the prover"],
              ["THIN", "Bitcoin whitepaper was released in 2008.", "bitcoin.org/bitcoin.pdf", "PDF/binary is unreadable → 100% poster"],
            ].map(([st, claim, url, pay]) => (
              <div key={st} className="bg-surface-container-low p-space-lg rounded-2xl flex flex-col gap-space-md">
                <span className="px-space-xs py-space-2xs rounded-full bg-secondary-container text-on-secondary-fixed font-badge-numeral text-badge-numeral w-fit">
                  RESULT: {st}
                </span>
                <h4 className="font-headline-lg text-headline-md uppercase leading-tight">“{claim}”</h4>
                <div className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">{url}</div>
                <p className="font-body-sm text-body-sm">{pay}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full py-space-3xl px-gutter-desktop">
        <div className="max-w-content-max-width mx-auto bg-primary text-on-primary p-space-2xl md:p-space-3xl rounded-3xl flex flex-col md:flex-row items-center justify-between gap-space-xl">
          <div className="max-w-xl">
            <span className="font-label-mono-sm text-label-mono-sm text-secondary-container uppercase tracking-widest font-bold">
              READY TO BACK A CLAIM OR PROVE A LIE?
            </span>
            <h2 className="font-headline-xl text-headline-xl uppercase tracking-tight leading-none">
              PUT UP YOUR TEST GEN.
              <br />
              THE LIVE PAGE SETTLES IT.
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-space-md">
            <Link
              className="px-space-xl py-space-md rounded-full bg-secondary-container text-on-secondary-fixed font-headline-md text-body-lg uppercase text-center"
              href="/back"
            >
              ENTER APP NOW
            </Link>
            <Link
              className="px-space-xl py-space-md rounded-full bg-surface-container-highest text-primary font-headline-md text-body-lg uppercase text-center"
              href="/browse"
            >
              BROWSE CLAIMS
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
