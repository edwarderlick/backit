# BackIt AGENT_LOG

Operating folder: `D:\backIt`. StudioNet only. No git push. No GitHub remote.

## Inventory (2026-09-04)

Stitch exports found (unzipped HTML + PNG, no zips):

| Folder | Screen | Route |
|---|---|---|
| `landing_marketing_home` | Landing | `/` |
| `how_backit_works_explainer` | How BackIt Works | `/how` |
| `back_a_claim_wizard` | Back a Claim wizard | `/back` |
| `browse_claims_feed` | Browse | `/browse` |
| `claim_detail_prove_settlement` | Claim detail + prove/cancel | `/claim/[id]` |
| `my_backs_dashboard_withdraw` | My Backs + credits + withdraw | `/me` |
| `economics` | Economics | `/economics` |
| `backit_brand_logo` | Logo SVG | `/logo.svg` |
| `backit_kinetic_swiss/DESIGN.md` | Design tokens | Tailwind theme |

No dedicated Wallet/Network screen. Wallet lives in the shared header + wrong-network banner. **Did not invent `/wallet`.**

Moved originals to `stitch/` (untouched source).

## Stitch omissions (hard blockers)

- Wrong-network banner printed **chain ID 421614** (Arbitrum Sepolia). Spec/docs: StudioNet **61999**. Banner copy corrected in the app.
- Landing mock “LIVE TICKET #0421” and “CASE 01/02/03” are **marketing fixtures**, not listing IDs. Live browse/detail IDs are SHA-256 hashes, never CASE-0001.
- Footer stitch link “Optimistic Dispute” renamed in the app to How It Works. No appeal surface.
- No countdown clocks, leaderboards, passports, or validator vote theater wired.
- “Attestation NFT minted” stitch copy is marketing; contract stores an attestation JSON string, no NFT.

## GenLayer APIs used (from docs, not guessed)

- Runner pin: `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`
- Payable: `@gl.public.write.payable`, `gl.message.value` (`u256`)
- Sender: `gl.message.sender_address` (docs: no `sender_account`)
- EOA payout: `gl.get_contract_at(addr).emit_transfer(value=...)`
- Fallback credits if emit throws / returns falsy
- Web: `gl.nondet.web.render(url, mode='text'|'html')` then `gl.nondet.web.get`
- Equivalence: `gl.vm.run_nondet_unsafe` comparing **outcome enum only**
- LLM: `gl.nondet.exec_prompt(..., response_format="json")`
- StudioNet: chain **61999**, RPC `https://studio.genlayer.com/api`, `studionet` from `genlayer-js/chains`
- Wallet: `GenLayerProvider` — MetaMask `eth_requestAccounts` + `wallet_switchEthereumChain` / `wallet_addEthereumChain` + `createClient({ chain: studionet, account, provider })`
- Writes: `client.writeContract({ ..., value })` then `waitForTransactionReceipt` / `waitForFinalization`
- RPC proxy: `POST /api/genlayer` (CORS)

## ID rule

`gl.message` has **no tx_hash and no nonce** (transaction-context docs). Equivalent transaction-correlated hash:

`sha256(origin | datetime | value | claim | url | entry_data)`

Collision breaker: rehash with a deterministic suffix. Never a global CASE counter. UI never assigns IDs.

## Deploy (StudioNet)

- Network already `studionet` chain 61999 RPC `https://studio.genlayer.com/api`
- Account `coverlock-submitter` `0x9ce8b4b8a355421f01779ebd0c49e22a8f1ff0dd` unlocked
- v1 deploy `0x4e6DDffB8CdFaf9141b29E827E8Dd413f4b65df1` / `0xec24131d6ebf614d9c61b978bade2c34c054cdc971321b5562356bad51b8d447`
- Payout-path redeploy after API research: `emit_transfer` returns **None**, not bool. Official IC→EOA is `_Recipient(Address).emit_transfer`; Studio fallback remains `get_contract_at`. Both raise → credits + `withdraw()`.
- Current contract `0x83EFF829F56756210c150591887c653F3233a135` tx `0xef49425566c691d0d15498ea26634f07d510ccac4c21d7f415a7dd466d768e01` ACCEPTED 5/5 AGREE
- Wallet: browser `createClient` uses same-origin `/api/genlayer` (Studio CORS). IDs from this tx's leader return, then `list_ids` diff. Receipts checked for leader ERROR/rollback. MetaMask RPC remains `https://studio.genlayer.com/api`. EOA payout reconstructs `Address(addr.as_hex)`.
- `gl.message` has no tx_hash/nonce; ids hash origin|sender|datetime|value|claim|url|entry_data
- `genvm-lint` rejects public `__receive__`; omitted. Failed child transfers are not auto-refunded (docs).

Direct tests: 15 passed after fixing GET-before-render so HTTP 404 is THIN (render mocks were swallowing status).

## Economics (contract)

- TRUE: 2.5% (`250 / 10000`) stays in contract treasury; remainder to poster
- FALSE: 100% to prover
- THIN / CANCELED: 100% to poster
- Dust: integer division; fee of 0 on tiny bonds stays with remainder recipient
- Kind is a label only

## Wallet picker (2026-09-05)

Connect no longer calls `eth_requestAccounts` on `window.ethereum`. Clicking **Connect wallet** (header, /me, /back, /claim) opens a modal:

- EIP-6963 discovered wallets first (MetaMask, Rabby, Coinbase, Brave, OKX, …)
- Legacy `window.ethereum` / `ethereum.providers` fallback if nothing announced
- Install links for catalog wallets that are not detected
- Selecting a row runs `eth_requestAccounts` on **that** provider, then StudioNet switch/add (61999, `https://studio.genlayer.com/api`)
- Session restore only if stored rdns/id still has `eth_accounts` for this origin
- WalletConnect QR not wired (no project id)

This is the public-app path: users pick a wallet instead of silent MetaMask attach.

## Live StudioNet validation (2026-09-05)

Explorer: https://explorer-studio.genlayer.com/address/0x83EFF829F56756210c150591887c653F3233a135

Human test (two wallets):

| Id | State | Poster | Prover | Payout |
|---|---|---|---|---|
| `8889602f…0b75` | THIN | `0x7E4E…9253` | `0x631a…bFEa` | 10 GEN native to poster (fee 0) |
| `33cc1877…08d9` | OPEN | `0x631a…bFEa` | 0x0 | 10 GEN still locked |
| `6220db09…1344` | CANCELED | `0x631a…bFEa` | 0x0 | 10 GEN native to poster |
| `003fd107…83b5` | THIN | `0x631a…bFEa` | `0x631a…bFEa` | 10 GEN native to poster |

`get_economics`: treasury 0, locked 10 GEN, credits 0, fee 250 bps. Contract balance 10 GEN = the OPEN bond.

THIN on `https://bitcoin.org/bitcoin.pdf` is correct: GET is binary PDF (`\\x00` / non-text) so leader returns THIN before the LLM. Equivalence on prove `0xb54ba88e…328d84a1` is that exact reason. Not a payout bug.

Viem `unknown RPC error` after a successful MetaMask sign is a Studio blip. `backClaim` now waits and diffs `list_ids` instead of telling the user the lock failed. Skip fee estimation (gasless). TRUE/FALSE fixtures must be HTML pages, not PDFs.

## Wikipedia THIN (2026-09-05)

`1cb32ca6…0522` on old contract `0x83EFF829…`: claim "Bitcoin was invented in 2008" @ wikipedia.org/wiki/Bitcoin still THIN with the CAPTCHA reason. Studio GET of Wikipedia is a Cloudflare interstitial (HTTP 200 + "just a moment" / "enable javascript"). Old prove treated that as final THIN **before** `web.render`.

Fix on new contract `0x835180828376DdE7d3430d0DB222F70e72F5459b` tx `0x2727e124…f4be71ad` (5/5 AGREE): bot-wall GET now tries render text/html; PDF/binary skips render. Direct tests 17 passed, lint passed.

Hardcoded 0x000… into `.env.local` from deploy.mjs matching Address(zero) in printed source; parser fixed to use `Contract Address` from Result. Env now points at `0x835180…5459b`.

First TRUE fixture: `https://example.com/` (no CF). Then retry Wikipedia on the new contract.

## PRESS THIN on chrome HTML (2026-09-05)

GitHub blog and Python Insider both THIN'd with "truncated before the article body" / "mostly metadata". GET returned a huge HTML shell; LLM only saw the first 12k of nav. Refunds were correct (2 GEN to poster, treasury unchanged at 0.10).

Fix on `0xEb3c460DD484fd3A4bF1003FA9C29f25B3c45568` tx `0x7c3b1ff3…a170f1d4`: strip script/nav/header/footer tags before the excerpt, and `web.render` when stripped text is still chrome-thin. 18 direct tests passed.

## Studio Next 403 Render Fallback (2026-09-25)

OpenAI and Coinbase proof fixtures on `0x5b9DDFdea6Cd444560398A56189250b0b422030d` settled `THIN` because `_fetch_source()` returned immediately on `HTTP 403` before `gl.nondet.web.render`.

Fix deployed to Studio dev contract `0x8418053BF408EC23C4E71A9144E93a49F920F4eC` tx `0xfebbea8467b308de2ace10b48ece7e3737d50f6445b54011e28b5378bec0ebcc`: 403, empty, bot-wall, and chrome-thin pages now try render text/html first. 404 and 5xx still settle `THIN`; 403 remains `THIN` if render is also unreadable. Direct tests 35 passed, Next build passed, lint static checks passed (local validation still missing runner tar).

## Studio Next Verifier Error Fallback (2026-09-25)

`prove()` on `0x8418053BF408EC23C4E71A9144E93a49F920F4eC` could show `FINALIZED FINISHED_WITH_ERROR` even though MetaMask/explorer showed the outer tx successful. Root cause: the leader raised `[LLM_ERROR]` for malformed AI JSON, unsupported quotes, or weak reasons. That rolls back storage, so the claim remains `OPEN`.

Fix deployed to Studio dev contract `0x66e2F3E56632bB216Df175158226340619a159C7` tx `0x85d450c2c62723f9311ecdbbdc222a2e9a4fbf52df00029fa915da5629dde652`: AI verifier unavailability/unusable output/unsupported quote/unsupported reason now settles `THIN` and refunds poster instead of reverting. Direct tests 35 passed, Next build passed, lint static checks passed (local validation still missing runner tar).

## Independent Validator Quote Verification (2026-09-25)

Steward review required validators to verify evidence instead of accepting enum-only agreement. `0x66e2F3E56632bB216Df175158226340619a159C7` still made validators inspect only the leader result shape, which was too weak.

Fix deployed to Studio dev contract `0xF118F6A0Df9B0480B01932f0D251e268F2C429B5` tx `0x44b0d6623d22810252088bf3c5a698f5a5e37318364650b6eedaaa8b3d531415`: validators now independently fetch/render the source, reject TRUE/FALSE if their fetch is THIN, require the leader quote to exist in their independently fetched excerpt, and require the quote/reason shape to support the selected outcome. Direct tests 35 passed, Next build passed, Studio Next integration read passed against the deployed contract, lint static checks passed (local validation still missing runner tar).

## Qualified Domain Allowlist (2026-09-25)

Steward review also allowed resolving the evidence model with qualified authoritative domains. Implemented a contract allowlist for official sources including GenLayer/OpenAI/Stripe/Coinbase docs/status/product domains plus selected protocol/vendor domains used by fixtures (`bitcoin.org`, `ethereum.org`, `blog.python.org`, `blog.google`). `back()` now rejects unlisted source domains before locking funds. `prove()` also checks the final redirect URL and settles `THIN` if an allowlisted source redirects to an unlisted host.

Frontend `/back` mirrors the allowlist and shows a pre-signing warning for unlisted domains. Tests migrated away from `example.com` fixtures and added explicit unlisted-domain and unlisted-final-redirect coverage. Deployed to Studio dev contract `0x1833BC2571945AeA73dD288334B5a78c6b401187` tx `0x5047998114190ed27113cea5e799287606655ed4eeaf8c062a326d941c81ee20`. Direct tests 37 passed, Next build passed, Studio Next integration read passed, lint static checks passed (local validation still missing runner tar).

## Negative Listing Reason Support (2026-09-26)

Coinbase-style negative listing claims could still settle `THIN` when the verifier returned `FALSE` with a positive availability reason such as "the price page lists USDC as available for trading"; the reason guard did not count that as FALSE support. Updated `_reason_supports()` so negative availability/listing/support claims accept positive listing, trading, price-page, asset-page, and support reasons. Added a direct regression test for "USDC is not available on Coinbase's centralized exchange." Deployed to Studio dev contract `0x4Eac5CdBdfF6307a0542393ca72627A823AF1D9A` tx `0x80f0f6572d8a05fb3322b4eb36784f586fdae5aba7e734cd72d5c8f0079bbf91`. Direct tests 38 passed, Next build passed, Studio Next integration read passed, lint static checks passed (local validation still missing runner tar).

## Semantic Equivalence Support Guard (2026-09-27)

Verifier prompt now treats paraphrase and semantic equivalence as support, not contradiction. The deterministic quote/reason guard rejects pedantic `FALSE` outcomes when the cited quote materially supports the positive claim, while still requiring the quote to appear in independently fetched validator excerpts. Removed the old placeholder `SUPPORT_CHECK` test mock and added direct regressions for the GenLayer protocol wording case: the pedantic `FALSE` settles `THIN`, while the equivalent `TRUE` settles `TRUE`. Deployed to Studio dev contract `0x7eE2F490A5D46f3249a2FF86A1ccD18AB3f6d4B9` tx `0x02214e980833ffcc9f06b6fdf4f70a197cfec243229bd0ef479a9f90034f7a3b`. `npm.cmd run verify` passed: 42 direct tests, production web build, and 3 Studio Next integration tests.

Follow-up for negative protocol claims: "only a static documentation website and not a blockchain protocol" now accepts a positive blockchain/protocol/consensus quote as substantive support for `FALSE`. Added the exact regression and redeployed to Studio dev contract `0x15A3AE82d4AC497A551B92Edde65b919275eB9e7` tx `0xdec6deffab5f954be64cbb158325b052094fa07d5f432a19306bcf762e1dbf37`. Direct tests: 44 passed. Production build passed. Static lint passed; local SDK validation still lacks the cached runner tar.

Follow-up for positive paraphrases: TRUE reasons now accept "describes", "says", "mentions", "equivalent", and claim-token overlap when the quote materially supports the claim, preventing equivalent positive claims from falling back to `THIN` just because the AI reason omitted the word "supports". Added the exact "describes GenLayer as an intelligent blockchain..." regression.

## Steward Value Guard and Clean Test Setup (2026-10-05)

The deterministic TRUE support guard now rejects quotes with conflicting numeric values, number words, months, or ticker-like identifiers, even when most claim tokens overlap. Direct regressions include a forged validator TRUE against an independently fetched contradictory value. The test environment pins `genlayer-test==0.30.0rc2` through `pyproject.toml` and `uv.lock`, providing `gltest.direct.sdk_compat`. The storage decorator alias now satisfies GenVM lint while preserving the runtime decorator. `npm run verify` passed with 51 direct tests, production build, and 3 integration reads against the new contract; GenVM lint and SDK validation passed.

Deployed the exact checked-out `contracts/backit.py` bytes to Studio Next as `0x1C549AA74bEf8d34BCa5B0c0Fa538096d55dB175` in `0x391a0755eab905ce8940d8a0cdc5ea46b6609348e3faaa3220c29a936f092b88`. The transaction is FINALIZED with FINISHED_WITH_RETURN, and the deployed source SHA-256 matches the local file. The deployment script now uses the project SDK's current fee estimate and verifies execution before changing local environment files. The Vercel production contract-address variable was updated; the public deployment must be verified after the Git push.

Follow-up: the guard also rejects conflicting capitalized person/company names and negation with adjacent punctuation. All 54 direct tests, production build, 3 Studio Next integration reads, GenVM lint, and SDK validation passed. Deployed the exact source to Studio Next as `0x9601abf2Ac906BdB9eDC474dDb492fee0Bf9A537` in `0xca76715fa34e9c553a7df77e2eb724fb8bdcfc8d3594ea575aaacf3f672566b5`; the transaction is FINALIZED with FINISHED_WITH_RETURN and its source hash matches the local file. A live 0.01 test GEN back/prove cycle finalized successfully and settled TRUE (`0xc3c1e42666a7bf1ad7ab6de1e14d302773a312025ac119bb42a2cb4c626e351f`, `0xfc04ab285c2f78cda14b2e0f138662ddcb7bf33f46abd91f22fa119fbd3b1a7e`).

## Steward Semantic Evidence Follow-up (2026-10-05)

The prior deployed support guard still accepted a fabricated TRUE result for claim “The board approved the merger proposal” with verbatim quote “The board rejected the merger proposal.” Added the failing regression before changing the contract. The leader and every validator now run an independent semantic support check over the claim, cited quote, and reason after the deterministic value/quote checks. The check requires the whole claim to be supported for TRUE or directly contradicted for FALSE, verifies the reason faithfully describes the quote, and fails closed on unavailable or malformed output. Validators still fetch the source independently and require the cited quote in their own excerpt.

The submitted Python dependency remains pinned to `genlayer-test==0.30.0rc2`. From a newly created Python 3.12 virtual environment, `uv pip install -r requirements.txt`, `import gltest.direct.sdk_compat`, and `python -m pytest tests/direct/test_backit.py -q` passed (44 tests). The unified `npm run verify` passed with 57 direct tests, the production web build, and 3 Studio Next integration tests. GenVM lint and validation passed.

Deployed the checked-out contract to Studio Next chain 61997 at `0x993FC4E6B1a678f8793296d61812C63cB88fb06c` in transaction `0xd4bb4bb4c15b601ddcf67fe3b6ef69f799576a76223edc71fcf6f4b238e5e966` (FINALIZED, FINISHED_WITH_RETURN). Live 0.01 test GEN proof cycles finalized TRUE (`0x5dec34648294b420d5f05014350c3eb988af85fd121c628fed7154d32cf17555`, `0xa6eeff5b13682b8b537f3c1612d57bc615acfc3ed98b897e0f223db7bc6c0c08`) and FALSE (`0xcec5f3a959d5d33b63b83e8dbc19428406967e80b8c66b1d05fcf5a3ce441be5`, `0x1da3566a4588958b962f9ae73aa4b8e7809a874c278a256efdc9b3da9a344be2`) on the authoritative GenLayer protocol page. The integration tests also passed against the new address.

Follow-up for the steward evidence issue: reproduced a forged TRUE path where the claim says a material action happened while the quote says the opposite action happened, and the mocked semantic checker incorrectly returns `SUPPORTS`. The deterministic support guard now rejects near-verbatim material conflicts before accepting a `TRUE` result, including opposite action, state, result, metric, and winner/loser substitutions. Added eight direct regression cases plus a validator regression that deliberately makes the semantic checker approve the contradictory quote. Deployed the checked-out contract to Studio Next chain 61997 at `0x42C9dC27178470A2Bd853Ae15C49E5aa7Cb1ec68` in transaction `0x1ee96bcbdac6d2dad5634cd8aabda34cba2043e590a84fea1ff20c82d7b57eae` (FINALIZED, FINISHED_WITH_RETURN). `npm.cmd run verify` passed with 65 direct tests, production build, and 3 Studio Next integration tests against the new default contract. A fresh Python 3.12 environment installed `requirements.txt`, imported `gltest.direct.sdk_compat`, and passed `python -m pytest tests/direct/test_backit.py -q` (52 tests). Live 0.01 test GEN proof cycles finalized TRUE (`0x988c38d2f60487d88df9f4306b81174d339c3b0d501804e421a8dcf87a936e4a`, `0xd3c699200e8775b14d8e39bb4f53711db2a6800c0371a8baf22b32beedc12064`) and FALSE (`0x458ddaa90358e43626b43a6d48f4b56894d03f3ff8c16c85bc2da11733a078df`, `0x67ab1b49227554130c96206ebeecc2011db2a777b70cc28fc49e7b8924f93a04`) on the authoritative GenLayer protocol page.

Source-match hardening before resubmission: Windows checkout line endings made the prior deployment source bytes CRLF even though GitHub stores `contracts/backit.py` as LF. `scripts/deploy.mjs` now normalizes contract source to LF before deployment and prints the exact source SHA-256. Redeployed the same contract logic to Studio Next chain 61997 at `0x4F6134D424AcfBb6DCB41E24D93060B6F77b53d3` in transaction `0x295773f6926da381701694db9a2773d411cfb724a74fbe2eef9d2c72d34b5eda` (FINALIZED, FINISHED_WITH_RETURN) with deployed source SHA-256 `cbb62b9165c4a2f805c9118f4a964230279cd6ca5fd2cdcb20a0ece1717483ff`, matching the LF-normalized GitHub source. `npm.cmd run verify` passed with 65 direct tests, production build, and 3 Studio Next integration tests against the LF-normalized contract. Live 0.01 test GEN proof cycles finalized TRUE (`0x05699564a81e49e9482bf03508595368854f62d41cc2c7499967024cc23d0778`, `0x698e86fd93694853c68ee5675812a5863d1d3e6c03a6cbcbb0c2097749601e2d`) and FALSE (`0x41d4a352b778c81009721bfbaec441c0120d94a29019ea3886363d56dae58d69`, `0x25db5bea9b69402d499c90191e7ccdbaf2d97aee61de3d8a0f914f6092dd62a3`) on the authoritative GenLayer protocol page.
