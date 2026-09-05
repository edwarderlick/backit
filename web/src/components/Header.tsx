"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGenLayer } from "./GenLayerProvider";
import { shortAddr } from "@/lib/format";
import { STUDIONET_CHAIN_ID } from "@/lib/chain";

const NAV = [
  { href: "/browse", label: "Browse Claims" },
  { href: "/back", label: "Back a Claim" },
  { href: "/me", label: "My Backs" },
  { href: "/economics", label: "Economics" },
  { href: "/how", label: "How It Works" },
];

export function Header() {
  const path = usePathname();
  const { account, connect, isConnecting, wrongNetwork, openWalletModal } = useGenLayer();

  return (
    <>
      {wrongNetwork && (
        <div className="w-full bg-error text-on-error px-gutter-desktop py-space-xs font-label-mono-sm text-label-mono-sm uppercase tracking-wider text-center flex items-center justify-center gap-space-xs z-[60] relative">
          <span className="material-symbols-outlined text-[16px]">warning</span>
          <span>
            WRONG NETWORK DETECTED. PLEASE SWITCH WALLET RPC TO GENLAYER STUDIONET (CHAIN ID{" "}
            {STUDIONET_CHAIN_ID}).
          </span>
        </div>
      )}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-20 max-w-content-max-width mx-auto px-gutter-desktop flex items-center justify-between gap-space-md">
          <Link href="/" className="flex items-center gap-space-sm">
            <img alt="BackIt Brand Logo" className="h-8 w-auto object-contain" src="/logo.svg" />
            <span className="font-headline-lg text-headline-md tracking-tight uppercase text-primary">
              BackIt
            </span>
            <span className="hidden sm:inline-flex items-center px-space-xs py-space-2xs rounded-full bg-surface-container font-label-mono-sm text-label-mono-sm text-on-surface-variant uppercase tracking-wider">
              StudioNet · GenLayer
            </span>
          </Link>
          <nav className="hidden xl:flex items-center gap-space-lg">
            {NAV.map((item) => {
              const active = path === item.href || path.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    active
                      ? "text-primary font-bold font-body-md text-body-md"
                      : "font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-space-xs">
            <div className="hidden md:flex items-center gap-space-2xs px-space-sm py-space-xs rounded-full bg-surface-container font-label-mono-sm text-label-mono-sm text-on-surface">
              <span className="w-2 h-2 rounded-full bg-secondary-container inline-block" />
              <span>StudioNet</span>
            </div>
            {account ? (
              <button
                className="flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-secondary-container text-on-secondary-fixed font-badge-numeral text-badge-numeral hover:bg-secondary-fixed transition-colors shadow-[0_2px_0px_#000000]"
                type="button"
                onClick={openWalletModal}
                title="Wallet"
              >
                <span>{shortAddr(account)}</span>
              </button>
            ) : (
              <button
                className="flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-secondary-container text-on-secondary-fixed font-badge-numeral text-badge-numeral hover:bg-secondary-fixed transition-colors shadow-[0_2px_0px_#000000]"
                type="button"
                onClick={connect}
                disabled={isConnecting}
              >
                {isConnecting ? "Connecting…" : "Connect wallet"}
              </button>
            )}
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
