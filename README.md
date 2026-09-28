# BackIt

Same-session live-web settlement on GenLayer Studio Next.

A poster locks test GEN on one sentence and one public HTTPS URL. A prover calls `prove`. Validators fetch the page themselves, treat fetched text as untrusted evidence, require a quote that exists in their own fetched excerpt, and settle `TRUE`, `FALSE`, or `THIN` in the same write.

Not a court. Not an appeal system. Not a delayed oracle. Studio Next only. No real value.

## Live

- App: [backit-seven.vercel.app](https://backit-seven.vercel.app/)
- Repo: [github.com/edwarderlick/backit](https://github.com/edwarderlick/backit)
- Chain: Studio Next `61997`
- RPC: `https://studio-dev.genlayer.com/api`
- Explorer: [explorer-studio-dev.genlayer.com](https://explorer-studio-dev.genlayer.com/)
- Current contract: [`0x0F3c9a99E4dBBE909cFe0778684B31e2D2526349`](https://explorer-studio-dev.genlayer.com/address/0x0F3c9a99E4dBBE909cFe0778684B31e2D2526349)
- Deploy tx: [`0xb68cc69c248689dc6835fb873e055a7f99100552e4c79be9332bc851435b9faf`](https://explorer-studio-dev.genlayer.com/tx/0xb68cc69c248689dc6835fb873e055a7f99100552e4c79be9332bc851435b9faf)

Vercel should use:

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0x0F3c9a99E4dBBE909cFe0778684B31e2D2526349
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio-dev.genlayer.com/api
GENLAYER_RPC_URL=https://studio-dev.genlayer.com/api
NEXT_PUBLIC_GENLAYER_CHAIN_ID=61997
```

The frontend also has the current contract as a fallback so a missing public env does not render an empty contract badge.

## Steward Evidence Model

BackIt uses the qualified-domain path, not an external archival snapshot service.

- Claims are restricted to a curated authoritative domain allowlist at `back()`.
- `prove()` follows the final redirect and rejects an unqualified final domain as `THIN`.
- The stored source board includes the original URL, final URL, final host, content hash, and quote.
- Fetched page text is fenced as untrusted evidence in the verifier prompt.
- Pages containing prompt-injection style instructions settle `THIN`.
- Validators independently fetch the same source, reject inaccessible or thin excerpts, and require the stored quote to appear in their own excerpt before accepting `TRUE` or `FALSE`.
- Validators run a deterministic support guard over their independently fetched excerpt, the stored quote, reason, claim, and outcome. The quote and reason must substantively justify the selected `TRUE` or `FALSE`; enum-only agreement is not enough. Paraphrases and semantic equivalence count as support, while wording-only differences are not treated as contradictions.
- Redirects, malicious HTML, mutable pages, divergent validator fetches, inaccessible sources, transfer/credit fallback, and cancellation/proof races have direct test coverage.

This is deliberately conservative: if a source is blocked, binary, inaccessible, malicious, or too ambiguous, the result is `THIN` and the poster is refunded.

## Flow

1. `back(claim, source_url, kind)` locks a bond and returns a SHA-256 id from transaction fields. The UI never invents ids.
2. Browse/detail read ids and settlements from contract storage.
3. `prove(id)` fetches the source, asks the AI verifier for structured evidence, validates the quote/reason guardrails, and settles.
4. `cancel(id)` is poster-only and only available after the commitment window while the claim is still `OPEN`.
5. If a native transfer fails, the contract records credit and the user calls `withdraw()`.

Outcomes:

| Outcome | Treasury | Poster | Prover |
|---|---:|---:|---:|
| TRUE | 2.5% | 87.5% | 10% |
| FALSE | 0% | 0% | 100% |
| THIN | 0% | 100% | 0% |
| CANCELED | 10% | 90% | 0% |

`THIN` means the evidence could not support a reliable `TRUE` or `FALSE`.

## Contract Surface

| Method | Role |
|---|---|
| `back(claim, source_url, kind)` payable | Lock bond and create claim |
| `prove(id)` | Permissionless fetch, verify, and settle |
| `cancel(id)` | Poster-only cancellation after the window while `OPEN` |
| `withdraw()` | Pull fallback credits |
| `get_back(id)` | Claim, evidence, settlement, and latest tx |
| `list_ids()` / `get_back_ids(offset, limit)` / `get_feed(offset, limit)` | Bounded feed reads |
| `get_economics()` / `get_credit(address)` | Treasury, locked amount, fees, and credits |

Runner pin: `py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng`

## Verification

Latest local verification for the current contract:

```bash
npm run verify
# direct tests + production web build + Studio Next integration
```

The same gate expands to:

```bash
uv run pytest tests/direct -q
# 43 passed

cd web
npm.cmd run build
# passed

BACKIT_CONTRACT=0x0F3c9a99E4dBBE909cFe0778684B31e2D2526349 uv run pytest tests/integration -v
# 3 passed
```

`uv run genvm-lint check contracts/backit.py` passes static lint. The SDK validation step can fail locally if the cached Studio Next runner tar is missing from `runners/py-genlayer/...`.

## Local Development

```bash
uv run pytest tests/direct -q

cd web
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000).

MetaMask should be on Studio Next chain `61997` with RPC `https://studio-dev.genlayer.com/api`.

## Deployment

Deploy contract:

```bash
node scripts/deploy.mjs
```

That writes `.env.local` and `web/.env.local` with the new address. After redeploying the contract, update `NEXT_PUBLIC_CONTRACT_ADDRESS` in Vercel if it is set there.

Pushes to `main` trigger Vercel for [backit-seven.vercel.app](https://backit-seven.vercel.app/).

## Repo Map

```text
contracts/backit.py                 Intelligent Contract
tests/direct/test_backit.py          Core economics and evidence tests
tests/direct/test_backit_adversarial.py
tests/integration/test_studio_next.py
scripts/deploy.mjs                   Studio Next deploy helper
web/                                 Next.js app
stitch/                              Original visual export
```

## Demo Notes

Use stable authoritative HTML pages. Dynamic search pages, bot walls, PDFs, and pages that return different content to different validators will often settle `THIN` or fail with majority disagreement. That is expected fail-closed behavior, not a trapped-funds path.
