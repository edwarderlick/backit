#!/usr/bin/env node
/** Deploy the checked-out contract to Studio Next (chain 61997). */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { createClient, createAccount } from "../web/node_modules/genlayer-js/dist/index.js";
import { studioDevnet } from "../web/node_modules/genlayer-js/dist/chains/index.js";

const require = createRequire(import.meta.url);
const keytar = require(resolve(homedir(), "AppData/Roaming/npm/node_modules/genlayer/node_modules/keytar"));
const root = resolve(import.meta.dirname, "..");
const rpc = "https://studio-dev.genlayer.com/api";
const accountName = process.env.BACKIT_DEPLOY_ACCOUNT || "coverlock-challenger";
const secret = await keytar.getPassword("genlayer-cli", `account:${accountName}`);
if (!secret) throw new Error(`Unlocked GenLayer account ${accountName} is unavailable`);
const account = createAccount(secret);
const client = createClient({ chain: studioDevnet, endpoint: rpc, account });

const profile = JSON.parse(readFileSync(resolve(root, "fee-profile.json"), "utf8"));
if (profile.chainId !== 61997 || !profile.deploy) {
  throw new Error("fee-profile.json is not for Studio Next deployment");
}
const estimate = await client.estimateTransactionFees({
  leaderTimeunitsAllocation: profile.deploy.leaderTimeunitsAllocation,
  validatorTimeunitsAllocation: profile.deploy.validatorTimeunitsAllocation,
});
const fees = { distribution: estimate.distribution, feeValue: estimate.feeValue };
console.log("Network: Studio Next 61997");
console.log("Deployer:", account.address);
console.log("Estimated fee deposit (wei):", estimate.feeValue.toString());

const code = readFileSync(resolve(root, "contracts/backit.py"), "utf8");
const hash = process.env.BACKIT_DEPLOY_HASH || await client.deployContract({ code, fees });
if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) throw new Error("Invalid deployment transaction hash");
console.log("Deployment transaction:", hash);
await client.waitForTransactionReceipt({
  hash,
  waitUntil: "finalized",
  retries: 100,
  interval: 3000,
});
const tx = await client.getTransaction({ hash });
const address = tx.data?.contract_address ?? tx.txDataDecoded?.contractAddress;
if (tx.statusName !== "FINALIZED" || tx.txExecutionResultName !== "FINISHED_WITH_RETURN" || !/^0x[a-fA-F0-9]{40}$/.test(String(address))) {
  throw new Error(`Deployment did not execute successfully: ${JSON.stringify({ hash, status: tx.statusName, execution: tx.txExecutionResultName, address })}`);
}

const env = `NEXT_PUBLIC_CONTRACT_ADDRESS=${address}\nGENLAYER_CONTRACT_ADDRESS=${address}\nNEXT_PUBLIC_STUDIO_RPC_URL=${rpc}\nNEXT_PUBLIC_GENLAYER_RPC_URL=${rpc}\nNEXT_PUBLIC_GENLAYER_CHAIN_ID=61997\nGENLAYER_RPC_URL=${rpc}\n`;
writeFileSync(resolve(root, ".env.local"), env);
writeFileSync(resolve(root, "web/.env.local"), env);
console.log("Contract address:", address);
console.log("Updated local environment files.");
