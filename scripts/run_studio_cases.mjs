#!/usr/bin/env node
/**
 * Autonomous StudioNet matrix for BackIt.
 * Signs with unlocked genlayer-cli keychain accounts. Never prints keys.
 */
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, createAccount } from "../web/node_modules/genlayer-js/dist/index.js";
import { studionet } from "../web/node_modules/genlayer-js/dist/chains/index.js";
import { TransactionStatus } from "../web/node_modules/genlayer-js/dist/types/index.js";

const require = createRequire(import.meta.url);
const keytar = require(
  "C:/Users/samir/AppData/Roaming/npm/node_modules/genlayer/node_modules/keytar",
);

const CONTRACT = "0xEb3c460DD484fd3A4bF1003FA9C29f25B3c45568";
const BOND = 10n ** 17n; // 0.1 GEN
const ROOT = resolve(import.meta.dirname, "..");

const CASES = [
  { id: "FACT-TRUE", kind: "FACT", expect: "TRUE", claim: "RFC 791 specifies the Internet Protocol and is dated September 1981.", url: "https://www.rfc-editor.org/rfc/rfc791" },
  { id: "FACT-FALSE", kind: "FACT", expect: "FALSE", claim: "RFC 791 specifies the Internet Protocol and was published in September 2024.", url: "https://www.rfc-editor.org/rfc/rfc791" },
  { id: "FACT-THIN", kind: "FACT", expect: "THIN", claim: "Bitcoin whitepaper was released in 2008.", url: "https://bitcoin.org/bitcoin.pdf" },
  { id: "LISTING-TRUE", kind: "LISTING", expect: "TRUE", claim: "The PyPI pytest listing says the pytest framework makes it easy to write small tests.", url: "https://pypi.org/project/pytest/" },
  { id: "LISTING-FALSE", kind: "LISTING", expect: "FALSE", claim: "The PyPI pytest listing says pytest is a Java-only Android testing framework.", url: "https://pypi.org/project/pytest/" },
  { id: "LISTING-THIN", kind: "LISTING", expect: "THIN", claim: "This PyPI package page is still published.", url: "https://pypi.org/project/this-package-does-not-exist-zz/" },
  { id: "PRESS-TRUE", kind: "PRESS", expect: "TRUE", claim: "CPython now officially supports RISC-V as a tier 3 platform.", url: "https://blog.python.org/2026/08/riscv-now-officially-supported" },
  { id: "PRESS-FALSE", kind: "PRESS", expect: "FALSE", claim: "The Python Insider post says CPython dropped all RISC-V support.", url: "https://blog.python.org/2026/08/riscv-now-officially-supported" },
  { id: "PRESS-THIN", kind: "PRESS", expect: "THIN", claim: "GitHub said the August 17 outage lasted 7 hours and 47 minutes.", url: "https://github.blog/news-insights/company-news/the-august-17-outage-and-the-work-ahead/" },
  { id: "JOB-TRUE", kind: "JOB", expect: "TRUE", claim: "python.org/jobs currently lists a Senior Python Developer posting.", url: "https://www.python.org/jobs/" },
  { id: "JOB-FALSE", kind: "JOB", expect: "FALSE", claim: "python.org/jobs currently lists a Chief Astronaut opening at NASA Headquarters.", url: "https://www.python.org/jobs/" },
  { id: "JOB-THIN", kind: "JOB", expect: "THIN", claim: "This Greenhouse job post is still accepting applications.", url: "https://www.python.org/jobs/999999/" },
  { id: "STATUS-TRUE", kind: "STATUS", expect: "TRUE", claim: "GitHub status reports All Systems Operational.", url: "https://www.githubstatus.com/api/v2/status.json" },
  { id: "STATUS-FALSE", kind: "STATUS", expect: "FALSE", claim: "GitHub status reports a global outage of all GitHub services.", url: "https://www.githubstatus.com/api/v2/status.json" },
  { id: "STATUS-THIN", kind: "STATUS", expect: "THIN", claim: "This status endpoint is returning a live incident feed.", url: "https://www.githubstatus.com/api/v2/missing-feed.json" },
  { id: "OTHER-TRUE", kind: "OTHER", expect: "TRUE", claim: "Bitcoin was invented in 2008.", url: "https://en.wikipedia.org/api/rest_v1/page/summary/Bitcoin" },
  { id: "OTHER-FALSE", kind: "OTHER", expect: "FALSE", claim: "Bitcoin was invented in 1998.", url: "https://en.wikipedia.org/api/rest_v1/page/summary/Bitcoin" },
  { id: "OTHER-THIN", kind: "OTHER", expect: "THIN", claim: "Bitcoin was invented in 2008.", url: "https://en.wikipedia.org/wiki/Bitcoin" },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function loadAccount(name) {
  const pk = await keytar.getPassword("genlayer-cli", `account:${name}`);
  if (!pk) throw new Error(`Keychain missing unlocked account ${name}`);
  return createAccount(pk);
}

function clientFor(account) {
  return createClient({
    chain: studionet,
    endpoint: "https://studio.genlayer.com/api",
    account,
  });
}

async function listIds(client) {
  const ids = await client.readContract({
    address: CONTRACT,
    functionName: "list_ids",
    args: [],
  });
  return Array.isArray(ids) ? ids.map(String) : [];
}

async function getBack(client, id) {
  return client.readContract({
    address: CONTRACT,
    functionName: "get_back",
    args: [id],
  });
}

async function getEconomics(client) {
  return client.readContract({
    address: CONTRACT,
    functionName: "get_economics",
    args: [],
  });
}

async function waitHash(client, hash) {
  return client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    retries: 80,
    interval: 3000,
  });
}

function newIds(before, after) {
  const prev = new Set(before.map((x) => x.toLowerCase()));
  return after.filter((id) => !prev.has(id.toLowerCase()));
}

async function recoverId(reader, before, started) {
  while (Date.now() - started < 180_000) {
    await sleep(4000);
    try {
      const after = await listIds(reader);
      const created = newIds(before, after);
      if (created.length) return created[created.length - 1];
    } catch {
      /* rate limit */
    }
  }
  return null;
}

async function writeOnce(client, functionName, args, value) {
  const hash = await client.writeContract({
    address: CONTRACT,
    functionName,
    args,
    ...(value !== undefined ? { value } : {}),
  });
  let receipt;
  try {
    receipt = await waitHash(client, hash);
  } catch (err) {
    return { hash, receipt: null, err: String(err?.message || err) };
  }
  return { hash, receipt, err: null };
}

async function main() {
  const poster = await loadAccount("coverlock-submitter");
  const prover = await loadAccount("coverlock-challenger");
  const posterClient = clientFor(poster);
  const proverClient = clientFor(prover);
  const reader = createClient({ chain: studionet, endpoint: "https://studio.genlayer.com/api" });

  console.log("poster", poster.address);
  console.log("prover", prover.address);
  console.log("contract", CONTRACT);
  console.log("bond", "0.1 GEN");

  const results = [];
  for (const c of CASES) {
    const row = { ...c, pass: false };
    console.log("\n====", c.id, "====");
    try {
      const before = await listIds(reader);
      const started = Date.now();
      let back;
      try {
        back = await writeOnce(posterClient, "back", [c.claim, c.url, c.kind], BOND);
        row.backTx = back?.hash;
        if (back?.err) row.backWaitErr = back.err;
      } catch (err) {
        row.error = String(err?.message || err);
        console.log("back throw", row.error);
      }
      try {
        const after = await listIds(reader);
        row.backId = newIds(before, after).at(-1) || null;
      } catch {
        row.backId = null;
      }
      if (!row.backId) {
        row.backId = await recoverId(reader, before, started);
      }
      if (!row.backId) {
        row.error = "back did not appear in list_ids";
        results.push(row);
        continue;
      }
      console.log("back id", row.backId, "tx", row.backTx || "");
      await sleep(5000);

      const proveClient = c.expect === "FALSE" ? proverClient : posterClient;
      try {
        const p = await writeOnce(proveClient, "prove", [row.backId]);
        row.proveTx = p.hash;
        if (p.err) row.proveWaitErr = p.err;
      } catch (err) {
        row.proveError = String(err?.message || err);
        console.log("prove throw", row.proveError);
      }

      const settleStart = Date.now();
      let rec = null;
      while (Date.now() - settleStart < 240_000) {
        await sleep(5000);
        try {
          rec = await getBack(reader, row.backId);
          if (rec && String(rec.state) !== "OPEN") break;
        } catch {
          /* still pending */
        }
      }
      if (!rec) {
        row.error = "could not read get_back after prove";
        results.push(row);
        continue;
      }
      row.state = String(rec.state);
      row.outcome = String(rec.outcome);
      row.kindOnchain = String(rec.kind);
      row.fee = String(rec.fee_paid);
      row.paidPoster = String(rec.paid_to_poster);
      row.paidProver = String(rec.paid_to_prover);
      row.reason = String(rec.reason || "").slice(0, 240);
      row.pass = row.state === c.expect && row.kindOnchain === c.kind;
      console.log("settled", row.state, "expect", c.expect, "pass", row.pass);
      console.log("reason", row.reason);
    } catch (err) {
      row.error = String(err?.message || err);
      console.log("case error", row.error);
    }
    results.push(row);
    await sleep(8000);
  }

  let eco = {};
  try {
    eco = await getEconomics(reader);
  } catch (err) {
    eco = { error: String(err?.message || err) };
  }
  const report = {
    contract: CONTRACT,
    poster: poster.address,
    prover: prover.address,
    economics: eco,
    passed: results.filter((r) => r.pass).length,
    total: results.length,
    results,
  };
  const out = resolve(ROOT, "artifacts", "studio_cases.json");
  writeFileSync(out, JSON.stringify(report, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));
  console.log("\n==== SUMMARY ====");
  console.log("passed", report.passed, "/", report.total);
  console.log("wrote", out);
  for (const r of results) {
    console.log(r.pass ? "PASS" : "FAIL", r.id, r.state || r.error || "");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
