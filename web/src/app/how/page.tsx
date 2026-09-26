import Link from "next/link";

export default function HowPage() {
  return (
    <div className="flex flex-col w-full">
      <section className="w-full bg-surface py-space-3xl px-gutter-desktop">
        <div className="max-w-content-max-width mx-auto flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-high mb-space-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary-container" />
            <span className="font-label-mono-sm text-label-mono-sm uppercase tracking-wider">
              GenLayer Native Live-Web Primitive
            </span>
          </div>
          <h1 className="font-display-hero text-display-hero uppercase text-primary tracking-tight max-w-5xl leading-none">
            PUT MONEY ON WHAT A PUBLIC PAGE SAYS RIGHT NOW.
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mt-space-lg">
            Not a court. Not a docket. Not a delayed oracle. BackIt is a same-session live-web
            verification protocol on GenLayer Studio Next. Test GEN only.
          </p>
          <div className="flex flex-wrap justify-center gap-space-md mt-space-xl">
            <Link
              href="/back"
              className="px-space-xl py-space-sm rounded-full bg-secondary-container text-on-secondary-fixed font-badge-numeral text-badge-numeral shadow-[0_4px_0px_#000000]"
            >
              POST A CLAIM BOND
            </Link>
            <Link
              href="/browse"
              className="px-space-xl py-space-sm rounded-full bg-surface-container-highest text-primary font-badge-numeral text-badge-numeral"
            >
              EXPLORE LIVE FEED
            </Link>
          </div>
        </div>
      </section>

      <section className="w-full bg-surface-container-low py-space-3xl px-gutter-desktop">
        <div className="max-w-content-max-width mx-auto">
          <h2 className="font-headline-xl text-headline-xl uppercase text-center mb-space-3xl">
            THE PROTOCOL LIFECYCLE
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
            {[
              ["01", "Back", "Poster locks test GEN on one sentence + one HTTPS URL. Kind is a label only."],
              ["02", "Open", "Anyone may commit a proof. Cancel is only open before that lock, and it slashes 10%."],
              ["03", "Prove", "Commit, then prove. Validators re-fetch the page and require the quote in that excerpt."],
              ["04", "Pay", "TRUE: 2.5% treasury, 10% prover, 87.5% poster. FALSE: 100% prover. THIN: 100% poster."],
            ].map(([n, t, b]) => (
              <div key={n} className="bg-surface rounded-xl p-space-lg flex flex-col gap-space-sm">
                <div className="w-8 h-8 rounded-full bg-secondary-container font-badge-numeral text-badge-numeral flex items-center justify-center">
                  {n}
                </div>
                <h3 className="font-headline-md text-headline-md uppercase">{t}</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full py-space-3xl px-gutter-desktop">
        <div className="max-w-content-max-width mx-auto bg-primary text-on-primary p-space-xl rounded-2xl">
          <div className="font-body-lg text-body-lg font-bold">Not a court or appeal docket</div>
          <p className="font-body-md text-body-md text-on-primary-container mt-space-sm">
            Judgment lives in the Intelligent Contract. The frontend never writes a verdict. There is
            no appeal, keeper, countdown, NFT, CASE counter, or validator vote theater. Prove twice
            reverts. Cancel after a proof lock reverts. A PDF, CAPTCHA, 404, or 5xx is THIN (refund), not
            FALSE. Page text is untrusted. If the quote is not on the fetched page, prove reverts and the bond stays open.
          </p>
        </div>
      </section>
    </div>
  );
}
