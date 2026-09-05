#!/usr/bin/env node
import { createPublicClient, http, formatEther } from "viem";

const RPC_URL =
  process.env.GENLAYER_RPC_URL ||
  process.env.NEXT_PUBLIC_STUDIO_RPC_URL ||
  "https://studio.genlayer.com/api";

const studionetChain = {
  id: 61999,
  name: "GenLayer StudioNet",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] }, public: { http: [RPC_URL] } },
};

const client = createPublicClient({
  chain: studionetChain,
  transport: http(RPC_URL),
});

export async function getBalance(address) {
  const balanceWei = await client.getBalance({ address });
  return { raw: balanceWei, formatted: formatEther(balanceWei) };
}

async function main() {
  const target = process.argv[2];
  console.log("===============================================================");
  console.log("  BackIt: IC → EOA payout probe");
  console.log("  RPC:", RPC_URL, "chain 61999");
  console.log("===============================================================");
  if (!target) {
    console.log("Usage: node scripts/verify_payout.mjs <eoa>");
    process.exit(0);
  }
  try {
    const b = await getBalance(target);
    console.log("EOA", target);
    console.log("Balance", b.formatted, "GEN");
  } catch (err) {
    console.log("RPC note:", err.message || err);
    console.log("StudioNet may simulate balances; reconstruct payouts from get_back().");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
