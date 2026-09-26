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
