# BackIt — steward notes

Product facts only. StudioNet test GEN. No real value.

- **Live app:** [https://backit-seven.vercel.app/](https://backit-seven.vercel.app/)
- **Contract:** [`0xEb3c460DD484fd3A4bF1003FA9C29f25B3c45568`](https://explorer-studio.genlayer.com/address/0xEb3c460DD484fd3A4bF1003FA9C29f25B3c45568)
- **Deploy tx:** [`0x7c3b1ff389ffe9dda09a1b79e59285f97bb3fcffce2ba79d1242a296a170f1d4`](https://explorer-studio.genlayer.com/tx/0x7c3b1ff389ffe9dda09a1b79e59285f97bb3fcffce2ba79d1242a296a170f1d4) (ACCEPTED, 5/5 AGREE)
- **Repo:** [github.com/edwarderlick/backit](https://github.com/edwarderlick/backit)
- **Chain:** 61999 · RPC `https://studio.genlayer.com/api`

## What it is

A poster locks test GEN on **one sentence + one HTTPS URL**. Anyone calls `prove`. Validators fetch the live page. The Intelligent Contract returns `TRUE | FALSE | THIN` and **moves GEN in that write**.

Not a court. No docket. No appeal. No keeper. No CASE counters. No NFT.

## Quoted prior reviews → what BackIt does

### Provider Court — id correlation

The client used to re-read a global count after finalize and assume `count - 1` was its own id. Concurrent creators could steal each other's ids.

**BackIt:** id = SHA-256 of `origin | sender | datetime | value | claim | url | entry_data`, plus a collision suffix. The UI never assigns ids. Browse/detail only accept 64-hex. Direct test: five `back()` calls → five distinct hashes, never `CASE-0001`. Unknown ids revert on `get_back` / `prove` / `cancel`.

### Provider Court — party-supplied weights

Unbounded clause weights let one easy clause dominate payout.

**BackIt:** there are **no weights**. Kind is a label (`FACT | LISTING | PRESS | JOB | STATUS | OTHER`) and does not change math. Direct test: all six kinds lock 10000 and TRUE-settle at fee 250 / poster 9750.

### Sybil Court — unauthenticated pages + UI/contract mismatch

Quoted: *“arbitrary public pages are not authenticated”* and *“the UI promised slash / forfeit while the old contract only recorded a number”* and *“a label without settlement is not a court.”*

**BackIt:** HTTPS only; `javascript:` / `data:` / `file:` rejected; length caps. Unreadable source (404/403/CAPTCHA/PDF/empty/5xx) is **THIN, never FALSE**. TRUE/FALSE/THIN **pay in the prove write**. There is no appeal method and no appeal UI. Landing mock is labeled `SAMPLE CARD · NOT A CONTRACT ID`. Economics numbers come from `get_economics()`, not a frontend cache.

### Alpha Court — trapped stakes, keeper cache, advertised deadlines

Quoted: *“Contract-held stakes and appeal bonds must either be released through a working repository-backed payout/refund path or the staking design must stop custodying funds it cannot return. Derive or verify every keeper recipient and amount against contract state instead of trusting the unauthenticated stake cache, and enforce the staking and appeal deadlines inside the contract methods.”*

**BackIt:** no keeper, no cache, no deadlines. `prove` and `cancel` call `_pay` in the same tx (`emit_transfer` → `get_contract_at` → credits + `withdraw()`). Prove twice reverts. Cancel after settle reverts. If the LLM returns a non-enum, prove reverts, the bond stays OPEN, and the poster cancels for 100%.

### LicenseLock — fail closed on missing evidence

Quoted: missing files / 404 / UNAVAILABLE must refund, not crash the VM and trap state. Commit SHAs must be immutable; no HEAD fallback.

**BackIt:** 404/403/CAPTCHA/PDF/5xx/empty → THIN, 100% poster. OPEN funds leave only via poster `cancel` or `prove`. No HEAD/main fallback because there is no git target — the URL is the evidence.

### Rainline — accepted pattern

Numeric pinned API, no prose verdicts, credits+withdraw if native IC→EOA fails, hash ids, UI matches methods.

**BackIt copies the money path** (credits + `withdraw()`, hash ids, UI = contract methods). **Honest difference:** Rainline compares a number from Open-Meteo JSON. BackIt asks the LLM for `TRUE|FALSE|THIN` against a live HTML page. Equivalence is **outcome enum only**. Quote/reason are stored, never compared. That is the remaining subjectivity, stated here so it is not hidden.

## Methods (this is the whole surface)

| Method | Role |
|---|---|
| `back(claim, source_url, kind)` payable | Lock bond. Returns hash id. |
| `cancel(id)` | Poster only, OPEN only, 100% refund |
| `prove(id)` | Permissionless fetch + settle + pay |
| `withdraw()` | Pull credits if native transfer failed |
| `get_back` / `list_ids` / `get_back_ids` | Views |
| `get_economics` / `get_credit` | Treasury, locked, credits |

## Economics (encoded)

| Outcome | Treasury | Poster | Prover |
|---|---|---|---|
| TRUE | 2.5% | remainder | 0 |
| FALSE | 0 | 0 | 100% |
| THIN | 0 | 100% | 0 |
| CANCELED | 0 | 100% | 0 |

## Live proofs on this contract

Autonomous matrix, 0.1 GEN bonds. Treasury after that run: 0.0175 GEN = seven TRUE × 2.5%. Locked 0. Credits 0.

| Path | Prove tx |
|---|---|
| FACT TRUE (RFC 791, Sept 1981) | [`0xe8138ee6…`](https://explorer-studio.genlayer.com/tx/0xe8138ee6ca6becbba1b8478078a6148b637579053d421eb2a65f39d6d8a5d247) |
| FACT FALSE (RFC 791 dated 2024) | [`0xf1b9f8ec…`](https://explorer-studio.genlayer.com/tx/0xf1b9f8ec0785b68c69e0c9c09bb7d28f5fdc7dbdee7f855b64ac9add1e521a9a) |
| FACT THIN (bitcoin.pdf) | [`0xc9536952…`](https://explorer-studio.genlayer.com/tx/0xc9536952d8e4d070d78644eb981a2315ea68bc416e5d82f9f06cb935f5b5ef10) |
| PRESS TRUE (CPython RISC-V) | [`0x0ec19f60…`](https://explorer-studio.genlayer.com/tx/0x0ec19f60ea1f1d9a0d64a9c7939e1cdaba4dcfccbeca2d39623e9b8b06efddf4) |
| JOB TRUE (python.org/jobs) | [`0xe3ad0feb…`](https://explorer-studio.genlayer.com/tx/0xe3ad0febf4c9f4792680b212a8311d7df1ffe614dcbc3360cd025f8003fa5905) |
| STATUS TRUE (GitHub status JSON) | [`0xfe53b7aa…`](https://explorer-studio.genlayer.com/tx/0xfe53b7aa44b5ba6fe818655eb5ff45835077090d7ce641a0f37e7a47656fbfa5) |
| OTHER TRUE (Wikipedia REST, 2008) | [`0x74c6317c…`](https://explorer-studio.genlayer.com/tx/0x74c6317ce7ad252d12258d8b4f0a7891bdb41563c95913676d2784dfb74c164c) |
| JOB THIN (HTTP 404) | [`0x5e0facd5…`](https://explorer-studio.genlayer.com/tx/0x5e0facd55e5ce67a80eebe790dff8ce98304ff17f8948d1bb728c86d3d0c9154) |

Public Vercel settlement on the same contract: 2 GEN FACT TRUE, fee 0.05 GEN, 1.95 GEN to poster, credits 0. Treasury after that write: 0.0675 GEN.

CAPTCHA / bot-wall sources refund the poster (THIN). That is fail-closed evidence, not a trapped-fund bug.

## What we did not build on purpose

Appeals, keepers, passports, leaderboards, validator-vote theater, CASE counters, attestation NFTs, countdown clocks. Those surfaces were how earlier submissions got rejected. BackIt omits them.

Runner pin: `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`
