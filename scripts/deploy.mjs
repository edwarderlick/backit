#!/usr/bin/env node
/**
 * Deploy contracts/backit.py to the current genlayer CLI network (use studionet).
 * Does not create a GitHub remote.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const contract = resolve(root, "contracts/backit.py");

function run(cmd, args) {
  console.log(`$ ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, { cwd: root, encoding: "utf8", shell: true });
  process.stdout.write(r.stdout || "");
  process.stderr.write(r.stderr || "");
  if (r.status !== 0) process.exit(r.status ?? 1);
  return r.stdout || "";
}

run("genlayer", ["network", "info"]);
const out = run("genlayer", ["deploy", "--contract", contract]);
const labeled = out.match(/['"]Contract Address['"]\s*:\s*['"](0x[a-fA-F0-9]{40})['"]/);
const recipient = out.match(/recipient:\s*['"](0x[a-fA-F0-9]{40})['"]/);
const addr = labeled?.[1] || recipient?.[1];
if (!addr || /^0x0+$/i.test(addr)) {
  console.error("Could not parse contract address from deploy output.");
  process.exit(1);
}
const env = `NEXT_PUBLIC_CONTRACT_ADDRESS=${addr}
GENLAYER_CONTRACT_ADDRESS=${addr}
NEXT_PUBLIC_STUDIO_RPC_URL=https://studio.genlayer.com/api
GENLAYER_RPC_URL=https://studio.genlayer.com/api
`;
writeFileSync(resolve(root, ".env.local"), env);
writeFileSync(resolve(root, "web/.env.local"), env);
console.log(`Wrote ${addr} to .env.local and web/.env.local`);
