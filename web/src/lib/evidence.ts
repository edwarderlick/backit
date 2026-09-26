export const ALLOWED_EVIDENCE_DOMAINS = [
  "docs.genlayer.com",
  "genlayer.com",
  "docs.openai.com",
  "openai.com",
  "status.openai.com",
  "docs.stripe.com",
  "stripe.com",
  "status.stripe.com",
  "docs.coinbase.com",
  "coinbase.com",
  "status.coinbase.com",
  "blog.google",
  "bitcoin.org",
  "ethereum.org",
  "blog.python.org",
] as const;

export function evidenceHost(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return host;
  } catch {
    return "";
  }
}

export function isAllowedEvidenceDomain(url: string): boolean {
  const host = evidenceHost(url);
  if (!host) return false;
  return ALLOWED_EVIDENCE_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export function evidenceDomainMessage(): string {
  return `Allowed official domains: ${ALLOWED_EVIDENCE_DOMAINS.slice(0, 8).join(", ")}, and selected protocol/vendor domains.`;
}
