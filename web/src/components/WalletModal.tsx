"use client";

import { useEffect } from "react";
import { useGenLayer } from "./GenLayerProvider";
import { catalogMisses } from "@/lib/injected-wallets";
import { shortAddr } from "@/lib/format";

export function WalletModal() {
  const {
    modalOpen,
    closeWalletModal,
    wallets,
    connectWallet,
    disconnect,
    account,
    isConnecting,
    error,
  } = useGenLayer();

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeWalletModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen, closeWalletModal]);

  if (!modalOpen) return null;

  const installs = catalogMisses(wallets);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-inverse-surface/50 px-gutter-mobile backdrop-blur-sm"
      onClick={closeWalletModal}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-modal-title"
        className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl bg-surface-container-lowest p-space-lg shadow-[0_16px_36px_-8px_rgba(0,0,0,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-space-md border-b border-outline-variant pb-space-md">
          <div>
            <h2
              id="wallet-modal-title"
              className="font-headline-lg text-headline-md uppercase tracking-tight text-primary"
            >
              Connect wallet
            </h2>
            <p className="mt-space-2xs font-label-mono-sm text-label-mono-sm uppercase tracking-wider text-on-surface-variant">
              StudioNet chain 61999. Test GEN only.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={closeWalletModal}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:text-primary"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {account ? (
          <div className="mt-space-md flex flex-col gap-space-sm">
            <p className="font-badge-numeral text-badge-numeral text-primary">{shortAddr(account)}</p>
            <p className="font-body-sm text-on-surface-variant">
              Pick another wallet to switch, or disconnect this session.
            </p>
            <button
              type="button"
              onClick={disconnect}
              className="w-full rounded-full bg-surface-container-highest px-space-md py-space-sm font-badge-numeral text-badge-numeral uppercase tracking-wider text-primary hover:bg-surface-dim"
            >
              Disconnect
            </button>
          </div>
        ) : null}

        <div className="mt-space-md flex flex-col gap-space-xs">
          {wallets.length === 0 ? (
            <p className="rounded-xl bg-surface-container-low p-space-md font-body-md text-on-surface-variant">
              No browser wallet detected. Install one below, then refresh this page.
            </p>
          ) : (
            wallets.map((wallet) => (
              <button
                key={wallet.id}
                type="button"
                disabled={isConnecting}
                onClick={() => void connectWallet(wallet)}
                className="group flex w-full items-center justify-between rounded-xl border border-outline-variant bg-surface-container-low px-space-md py-space-sm text-left transition-colors hover:border-primary hover:bg-surface-container-high disabled:opacity-50"
              >
                <span className="flex min-w-0 items-center gap-space-sm">
                  {wallet.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={wallet.icon} alt="" className="h-8 w-8 shrink-0 rounded-lg" />
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
                      <span className="material-symbols-outlined text-[18px] text-on-primary">
                        account_balance_wallet
                      </span>
                    </span>
                  )}
                  <span className="truncate font-body-lg text-primary">{wallet.name}</span>
                </span>
                <span className="font-label-mono-sm text-label-mono-sm uppercase tracking-wider text-secondary">
                  {isConnecting ? "Connecting" : "Detected"}
                </span>
              </button>
            ))
          )}
        </div>

        {installs.length > 0 ? (
          <div className="mt-space-md border-t border-outline-variant pt-space-md">
            <p className="mb-space-xs font-label-mono-sm text-label-mono-sm uppercase tracking-wider text-on-surface-variant">
              Install a wallet
            </p>
            <div className="flex flex-col gap-space-xs">
              {installs.map((row) => (
                <a
                  key={row.rdns}
                  href={row.installUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-between rounded-xl border border-outline-variant bg-surface px-space-md py-space-sm hover:border-primary"
                >
                  <span className="font-body-md text-primary">{row.name}</span>
                  <span className="font-label-mono-sm text-label-mono-sm uppercase tracking-wider text-on-surface-variant">
                    Install
                  </span>
                </a>
              ))}
            </div>
          </div>
        ) : null}

        <p className="mt-space-md font-body-sm text-on-surface-variant">
          WalletConnect QR for mobile is not wired yet. Use an injected browser wallet for this
          public StudioNet test.
        </p>

        {error ? (
          <p className="mt-space-sm rounded-xl bg-error-container p-space-sm font-body-sm text-on-error-container">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
