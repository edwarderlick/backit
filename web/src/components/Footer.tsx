import Link from "next/link";
import { CONTRACT_ADDRESS, EXPLORER_URL } from "@/lib/chain";
import { shortAddr } from "@/lib/format";

export function Footer() {
  return (
    <footer className="w-full bg-primary text-on-primary py-space-3xl">
      <div className="max-w-content-max-width mx-auto px-gutter-desktop flex flex-col gap-space-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-space-xl">
          <div className="flex flex-col gap-space-xs">
            <span className="font-headline-xl text-headline-xl uppercase tracking-tight text-secondary-container">
              BackIt
            </span>
            <p className="font-body-md text-body-md text-on-primary-container max-w-md">
              Settled on GenLayer live-web consensus. Not a court. Put up or shut up.
            </p>
          </div>
          <div className="flex flex-wrap gap-space-xl font-label-mono-sm text-label-mono-sm uppercase tracking-wider">
            <div className="flex flex-col gap-space-xs">
              <span className="text-surface-tint">Protocol</span>
              <Link className="hover:text-secondary-container transition-colors" href="/browse">
                Claims feed
              </Link>
              <Link className="hover:text-secondary-container transition-colors" href="/economics">
                Bond mechanics
              </Link>
              <Link className="hover:text-secondary-container transition-colors" href="/how">
                How it works
              </Link>
            </div>
            <div className="flex flex-col gap-space-xs">
              <span className="text-surface-tint">Resources</span>
              <a
                className="hover:text-secondary-container transition-colors"
                href="https://docs.genlayer.com/"
                target="_blank"
                rel="noreferrer"
              >
                GenLayer Docs
              </a>
              <a
                className="hover:text-secondary-container transition-colors"
                href={
                  CONTRACT_ADDRESS
                    ? `${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`
                    : EXPLORER_URL
                }
                target="_blank"
                rel="noreferrer"
              >
                Studio Next contract
              </a>
              <a
                className="hover:text-secondary-container transition-colors"
                href="https://backit-seven.vercel.app/"
                target="_blank"
                rel="noreferrer"
              >
                Live app
              </a>
              <a
                className="hover:text-secondary-container transition-colors"
                href="https://github.com/edwarderlick/backit"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-space-sm pt-space-xl bg-primary-container/40 p-space-md rounded-xl font-label-mono-sm text-label-mono-sm text-on-primary-container">
          <a
            className="flex items-center gap-space-xs hover:text-secondary-container transition-colors"
            href={CONTRACT_ADDRESS ? `${EXPLORER_URL}/address/${CONTRACT_ADDRESS}` : EXPLORER_URL}
            target="_blank"
            rel="noreferrer"
            title="Open current BackIt contract on Studio Next explorer"
          >
            <span className="w-2 h-2 rounded-full bg-secondary-container" />
            <span>
              CONTRACT: {CONTRACT_ADDRESS ? shortAddr(CONTRACT_ADDRESS) : "not deployed"} (GENLAYER
              INTELLIGENT CONTRACT)
            </span>
          </a>
          <div>BackIt · Studio Next test GEN · no real value</div>
        </div>
      </div>
    </footer>
  );
}
