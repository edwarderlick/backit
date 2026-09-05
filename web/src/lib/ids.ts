/** IDs come from the contract hash. The UI never assigns or remaps them. */
export function isContractId(id: string): boolean {
  return /^[0-9a-f]{64}$/i.test(id);
}

export function diffNewIds(before: string[], after: string[]): string[] {
  const prev = new Set(before.map((x) => x.toLowerCase()));
  return after.filter((id) => !prev.has(id.toLowerCase()));
}
