export function StateChip({ state }: { state: string }) {
  const s = (state || "OPEN").toUpperCase();
  const cls =
    s === "OPEN"
      ? "bg-secondary-container text-on-secondary-fixed"
      : s === "TRUE"
        ? "bg-secondary-container text-on-secondary-fixed"
        : s === "FALSE"
          ? "bg-error text-on-error"
          : s === "THIN"
            ? "bg-surface-container-highest text-on-surface"
            : "bg-surface-container text-on-surface";
  return (
    <span className={`px-space-xs py-space-2xs rounded-full font-badge-numeral text-badge-numeral uppercase ${cls}`}>
      {s}
    </span>
  );
}
