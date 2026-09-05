export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-surface-container-lowest p-space-xl rounded-2xl text-center flex flex-col gap-space-sm">
      <span className="material-symbols-outlined text-[32px] text-secondary">inbox</span>
      <h3 className="font-headline-md text-headline-md uppercase">{title}</h3>
      <p className="font-body-md text-body-md text-on-surface-variant">{body}</p>
    </div>
  );
}

export function LoadingState({ label = "Loading contract state…" }: { label?: string }) {
  return (
    <div className="bg-surface-container-lowest p-space-xl rounded-2xl font-label-mono-sm text-label-mono-sm uppercase tracking-wider flex items-center gap-space-sm">
      <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
      {label}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="bg-error-container text-on-error-container p-space-md rounded-xl font-body-md text-body-md">
      {message}
    </div>
  );
}
