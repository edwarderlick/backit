#!/usr/bin/env node
/**
 * Deploy contracts/backit.py to Studio Next (chain 61997).
 * Does not create a GitHub remote.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";

const root = resolve(import.meta.dirname, "..");
const contract = resolve(root, "contracts/backit.py");

function run(cmd, args) {
  console.log(`$ ${cmd} ${args.join(" ")}`);
  let bin = cmd;
  let finalArgs = args;
  if (process.platform === "win32" && cmd === "genlayer") {
    bin = "node";
    finalArgs = [resolve(homedir(), "AppData/Roaming/npm/node_modules/genlayer/dist/index.js"), ...args];
  }
  const r = spawnSync(bin, finalArgs, { cwd: root, encoding: "utf8", shell: false });
  process.stdout.write(r.stdout || "");
  process.stderr.write(r.stderr || "");
  if (r.error) console.error(r.error);
  if (r.status !== 0) process.exit(r.status ?? 1);
  return r.stdout || "";
}

const rpc = "https://studio-dev.genlayer.com/api";
const out = run("genlayer", [
  "deploy",
  "--contract",
  contract,
  "--rpc",
  rpc,
  "--fee-profile",
  resolve(root, "fee-profile.json"),
]);
const labeled = out.match(/['"]Contract Address['"]\s*:\s*['"](0x[a-fA-F0-9]{40})['"]/);
const recipient = out.match(/recipient:\s*['"](0x[a-fA-F0-9]{40})['"]/);
const addr = labeled?.[1] || recipient?.[1];
if (!addr || /^0x0+$/i.test(addr)) {
  console.error("Could not parse contract address from deploy output.");
  process.exit(1);
}
const env = `NEXT_PUBLIC_CONTRACT_ADDRESS=${addr}
GENLAYER_CONTRACT_ADDRESS=${addr}
NEXT_PUBLIC_STUDIO_RPC_URL=${rpc}
NEXT_PUBLIC_GENLAYER_RPC_URL=${rpc}
NEXT_PUBLIC_GENLAYER_CHAIN_ID=61997
GENLAYER_RPC_URL=${rpc}
`;
writeFileSync(resolve(root, ".env.local"), env);
writeFileSync(resolve(root, "web/.env.local"), env);
console.log(`Wrote ${addr} to .env.local and web/.env.local`);
