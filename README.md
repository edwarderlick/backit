# BackIt

**Same-session live-web primitive on GenLayer StudioNet.**

A poster locks **test GEN** on one sentence and one official HTTPS URL. Anyone calls `prove`. Validators fetch the live page. The Intelligent Contract returns `TRUE | FALSE | THIN` and **moves money in that write**.

Not a court. Not an appeal board. Not a delayed oracle. Not a keeper network. StudioNet only. **No real value.**

### Live

- **App:** [https://backit-seven.vercel.app/](https://backit-seven.vercel.app/)
- **StudioNet contract:** [`0xEb3c460DD484fd3A4bF1003FA9C29f25B3c45568`](https://explorer-studio.genlayer.com/address/0xEb3c460DD484fd3A4bF1003FA9C29f25B3c45568)
- **Deploy tx:** [`0x7c3b1ff389ffe9dda09a1b79e59285f97bb3fcffce2ba79d1242a296a170f1d4`](https://explorer-studio.genlayer.com/tx/0x7c3b1ff389ffe9dda09a1b79e59285f97bb3fcffce2ba79d1242a296a170f1d4) (ACCEPTED, 5/5 AGREE)
- **Chain ID:** 61999
- **RPC:** `https://studio.genlayer.com/api`
- **Repo:** [github.com/edwarderlick/backit](https://github.com/edwarderlick/backit)

---

## Architecture

```mermaid
graph TD
    A[Poster] -->|back + bond GEN| B(BackIt IC)
    B -->|id = SHA-256 of tx fields| C{OPEN}
    C -->|poster cancel| D[CANCELED: 100% poster]
    C -->|anyone prove| E[Validators fetch HTTPS URL]
    E --> F[Outcome enum only: TRUE / FALSE / THIN]
    F -->|TRUE| G[2.5% treasury, 97.5% poster]
    F -->|FALSE| H[100% prover]
    F -->|THIN: 404/403/CAPTCHA/PDF/empty/5xx| I[100% poster]
    G -.->|emit_transfer fail| J[credits then withdraw]
    H -.->|emit_transfer fail| J
    I -.->|emit_transfer fail| J
    D -.->|emit_transfer fail| J
```

Equivalence compares **outcome enum only**. Quote and reason are stored, never compared.

---

## How it works

1. **Back** — poster sends test GEN with one claim sentence, one `https://` URL, and a kind label (`FACT`, `LISTING`, `PRESS`, `JOB`, `STATUS`, `OTHER`). Kind is display only. It does not change payout.
2. **Id** — the contract returns a SHA-256 of the transaction fields (`origin`, sender, datetime, value, claim, url, calldata). The UI never invents or remaps ids. Browse and detail only accept 64-hex.
3. **Open** — anyone may `prove`. Only the poster may `cancel`, and only while OPEN. There is no deadline and no second round.
4. **Prove** — validators fetch the live page (GET, then render if the GET is chrome or a bot-wall). HTML nav/header/footer/script is stripped. PDF / CAPTCHA / 404 / 403 / 5xx / empty is **THIN**. Otherwise the LLM must return exactly `TRUE`, `FALSE`, or `THIN`. Consensus is on that enum.
5. **Pay in the same write** — TRUE: 2.5% treasury, rest poster. FALSE: 100% prover. THIN and CANCELED: 100% poster. If native `emit_transfer` fails, the amount is credited and the recipient calls `withdraw()`.

Prove twice reverts. Cancel after settle reverts. Unknown ids revert. If the LLM returns garbage, prove reverts, the bond stays OPEN, and the poster can cancel for a full refund.

---

## Economics (encoded, then mirrored in UI)

| Outcome | Treasury | Poster | Prover |
|---|---|---|---|
| TRUE | 2.5% (`250 / 10000`) | remainder | 0 |
| FALSE | 0 | 0 | 100% |
| THIN | 0 | 100% | 0 |
| CANCELED | 0 | 100% | 0 |

Kind does not change this table.

---

## Live StudioNet proofs (2026-09-05)

Autonomous matrix on this contract, 0.1 GEN bonds, poster `0x9CE8…F0DD`, prover `0xBb4e…A48a`. Treasury after the run: **0.0175 GEN** = seven TRUE settlements × 2.5%. Locked 0. Credits 0.

| Case | State | Prove / back tx |
|---|---|---|
| FACT TRUE (RFC 791, Sept 1981) | TRUE | [`0xe8138ee6…`](https://explorer-studio.genlayer.com/tx/0xe8138ee6ca6becbba1b8478078a6148b637579053d421eb2a65f39d6d8a5d247) |
| FACT FALSE (RFC 791 dated 2024) | FALSE | [`0xf1b9f8ec…`](https://explorer-studio.genlayer.com/tx/0xf1b9f8ec0785b68c69e0c9c09bb7d28f5fdc7dbdee7f855b64ac9add1e521a9a) |
| FACT THIN (bitcoin.pdf) | THIN | [`0xc9536952…`](https://explorer-studio.genlayer.com/tx/0xc9536952d8e4d070d78644eb981a2315ea68bc416e5d82f9f06cb935f5b5ef10) |
| PRESS TRUE (CPython RISC-V tier 3) | TRUE | [`0x0ec19f60…`](https://explorer-studio.genlayer.com/tx/0x0ec19f60ea1f1d9a0d64a9c7939e1cdaba4dcfccbeca2d39623e9b8b06efddf4) |
| JOB TRUE (python.org/jobs) | TRUE | [`0xe3ad0feb…`](https://explorer-studio.genlayer.com/tx/0xe3ad0febf4c9f4792680b212a8311d7df1ffe614dcbc3360cd025f8003fa5905) |
| STATUS TRUE (GitHub status JSON) | TRUE | [`0xfe53b7aa…`](https://explorer-studio.genlayer.com/tx/0xfe53b7aa44b5ba6fe818655eb5ff45835077090d7ce641a0f37e7a47656fbfa5) |
| OTHER TRUE (Wikipedia REST, 2008) | TRUE | [`0x74c6317c…`](https://explorer-studio.genlayer.com/tx/0x74c6317ce7ad252d12258d8b4f0a7891bdb41563c95913676d2784dfb74c164c) |
| JOB THIN (HTTP 404) | THIN | [`0x5e0facd5…`](https://explorer-studio.genlayer.com/tx/0x5e0facd55e5ce67a80eebe790dff8ce98304ff17f8948d1bb728c86d3d0c9154) |

Public app settlement on the same contract (2 GEN FACT TRUE): fee **0.05 GEN**, poster **1.95 GEN**, credits 0. Treasury after that write: **0.0675 GEN**.

CAPTCHA / bot-wall sources refund the poster (THIN). That is fail-closed evidence, not a trapped-fund bug. A PDF is THIN because validators cannot read binary; use an HTML source if you want TRUE/FALSE.

---

## Contract surface

| Method | Role |
|---|---|
| `back(claim, source_url, kind)` payable | Lock bond. Returns hash id. |
| `cancel(id)` | Poster only, OPEN only, 100% refund |
| `prove(id)` | Permissionless fetch + settle |
| `withdraw()` | Pull credits if native transfer failed |
| `get_back` / `list_ids` / `get_back_ids` | Views |
| `get_economics` / `get_credit` | Treasury, locked, credits |

Runner pin: `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`

---

## Repo

```
contracts/backit.py
tests/direct/test_backit.py
scripts/deploy.mjs
web/                 Next.js App Router (Vercel root)
stitch/              original Stitch HTML/PNG, untouched
```

Routes: `/` `/how` `/back` `/browse` `/claim/[id]` `/me` `/economics`

IDs in browse/detail are 64-char hex from the contract. The UI never invents them.

---

## Local

```bash
pytest tests/direct/test_backit.py -v
genvm-lint check contracts/backit.py

genlayer network set studionet
node scripts/deploy.mjs   # writes web/.env.local

cd web
npm install
npm run dev
```

`.env.example`:

```
NEXT_PUBLIC_CONTRACT_ADDRESS=0xEb3c460DD484fd3A4bF1003FA9C29f25B3c45568
NEXT_PUBLIC_STUDIO_RPC_URL=https://studio.genlayer.com/api
```

Connect MetaMask to StudioNet **61999**, RPC `https://studio.genlayer.com/api`. Browser reads go through `POST /api/genlayer` (Studio CORS).

---

## Vercel

Next app root is `web/`. Live: [https://backit-seven.vercel.app/](https://backit-seven.vercel.app/)

1. Build: `npm run build` in `web/`
2. Env: `NEXT_PUBLIC_CONTRACT_ADDRESS`, `NEXT_PUBLIC_STUDIO_RPC_URL=https://studio.genlayer.com/api`
3. StudioNet is rate-limited. Do not hammer prove.

---

## Honesty / demo scope

- StudioNet test GEN only. Not insurance, not a legal court, not mainnet.
- Live HTTPS pages can be CAPTCHA-blocked. That is THIN (refund), never FALSE.
- `bitcoin.org/bitcoin.pdf` settles THIN (binary). RFC HTML pages settle TRUE/FALSE.
- WalletConnect QR is not wired. Injected EIP-6963 wallets only.
- Validators agree on `TRUE | FALSE | THIN` only. Quote and reason are stored, never compared.
