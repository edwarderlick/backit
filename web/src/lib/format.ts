export const WEI = BigInt(10) ** BigInt(18);
const ZERO = BigInt(0);

export function formatGen(wei: bigint | number | string | null | undefined, digits = 2): string {
  const v = toWei(wei);
  const neg = v < ZERO;
  const abs = neg ? -v : v;
  const whole = abs / WEI;
  const frac = abs % WEI;
  const fracStr = frac.toString().padStart(18, "0").slice(0, digits);
  return `${neg ? "-" : ""}${whole.toString()}.${fracStr}`;
}

export function parseGen(input: string): bigint {
  const t = input.trim();
  if (!t) return ZERO;
  const [w, f = ""] = t.split(".");
  const frac = (f + "000000000000000000").slice(0, 18);
  return BigInt(w || "0") * WEI + BigInt(frac);
}

export function toWei(wei: bigint | number | string | null | undefined): bigint {
  if (wei === null || wei === undefined || wei === "") return ZERO;
  if (typeof wei === "bigint") return wei;
  if (typeof wei === "number") return BigInt(Math.trunc(wei));
  try {
    return BigInt(wei);
  } catch {
    return ZERO;
  }
}

export function shortAddr(addr?: string | null): string {
  if (!addr) return "—";
  const a = addr.startsWith("0x") ? addr : `0x${addr}`;
  if (a.length < 12) return a;
  return `${a.slice(0, 6)}...${a.slice(-4)}`;
}

export function shortId(id?: string | null): string {
  if (!id) return "—";
  if (id.length <= 14) return id;
  return `${id.slice(0, 8)}…${id.slice(-6)}`;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
