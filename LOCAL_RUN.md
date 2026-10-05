# LOCAL RUN

## Current Studio Next deployment (October 6, 2026)

- Chain: `61997`; RPC: `https://studio-dev.genlayer.com/api`
- Contract: `0x42C9dC27178470A2Bd853Ae15C49E5aa7Cb1ec68`
- Deploy tx: `0x1ee96bcbdac6d2dad5634cd8aabda34cba2043e590a84fea1ff20c82d7b57eae` (FINALIZED, FINISHED_WITH_RETURN)
- `npm run verify`: 65 direct tests, production build, 3 Studio Next integration tests passed.
- Fresh Python 3.12 environment: `uv pip install -r requirements.txt`, `import gltest.direct.sdk_compat`, and `python -m pytest tests/direct/test_backit.py -q` passed (52 tests).
- GenVM lint and validation passed. Live TRUE and FALSE proof cycles finalized successfully on the current contract.

## Historical Studio Next run (September 2026)

- Network: `studio-dev` / chain `61997` (`0xf22d`)
- RPC: `https://studio-dev.genlayer.com/api`
- Explorer: `https://explorer-studio-dev.genlayer.com`
- Contract: `0x15A3AE82d4AC497A551B92Edde65b919275eB9e7`
- Deploy tx: `0xdec6deffab5f954be64cbb158325b052094fa07d5f432a19306bcf762e1dbf37`
- Deploy receipt stdout/stderr: empty
- Fee deposit used: `25000000000002588` wei

## Verification

- `uv run pytest tests/direct -v`: 38 passed
- `uv run genvm-lint check contracts/backit.py`: static lint passed; SDK validation cannot load the local Studio Next runner tar from the linter cache
- `npm.cmd run build` in `web/`: passed
- `BACKIT_CONTRACT=0x15A3AE82d4AC497A551B92Edde65b919275eB9e7 uv run pytest tests/integration -v`: 3 passed
- `genlayer schema`: exposes `back`, `cancel`, `get_back`, `get_back_ids`, `get_credit`, `get_economics`, `get_feed`, `list_ids`, `prove`, `withdraw`
- Read-only smoke:
  - `list_ids` returned `[]`
  - `get_economics` returned `count=0`, `locked=0`, `credits=0`, `treasury=0`, `fee_bps=250`, `prover_bps=1000`, `cancel_bps=1000`, `feed_max=20`
  - `eth_chainId` returned `0xf22d`

## Notes

- The broken old contract was `0x19513a8db661e2e6FdF4123A6D83136Ba8863A61`.
- The previous active contract was `0x8ac9AD6eb51b030A8a209072054B70AbE8598850`.
- Failed cancel inspected: `0x1dfd2dd77427c2bfcef379736b96f2f22bdd44d0eae13083f09e54805aaaa400`.
  Explorer/RPC details showed `FINISHED_WITH_ERROR` with rollback payload `[EXPECTED] cancel window not reached`; the back stayed `OPEN`, `locked=2 GEN`, poster credit stayed `0`.
- The UI now blocks cancel until the 10-minute commitment window has elapsed, verifies post-cancel state is `CANCELED`, and verifies the poster receives either the direct 90% payout record or a matching credit fallback.
- Lock tx `0x0a7f97945ca4080ac60b7871ece4906da7169175cf7d73f15f0962cffccc3323` created id `8e376994821914e0c6175963737632f881c85d9773d5b945bec049c0a4465333`.
  The claim is `OPEN`, poster is `0x31e14df3b4f47F2428F3B78E7279691A78f70a05`, amount is `2 GEN`, and contract `locked` is `2 GEN`.
  The prior UI error was a false negative: TransactionKit finalized without exposing a positive `FINISHED_WITH_RETURN` marker in the tracked status object, even though storage changed.
- Prove tx `0x6d15f3d9c0e627932ba7ac5d8b3a1e1c2e3f651debd23500f44ff115d430ace2` on `0x3A76A06f9b34257B2BeC9E69b3D1e725bBE982b0` finished with `result_name=MAJORITY_DISAGREE`; storage correctly stayed `OPEN`.
  Root cause was validator equivalence checking volatile fetch URL/content hash as well as outcome. The current contract validates quote/reason in the leader, then validator equivalence compares the outcome enum only.
  The frontend now treats `MAJORITY_DISAGREE` as a failed write and closes the prove modal so the page error is visible.
- Prove tx `0x9465171c803e86c8506ba73d649ac7c456206ea4cea2d46e4cff44d302b1d343` on `0x242dC29b992E1B61A5Be755abD1E45fE53B698C9` also finished with `result_name=MAJORITY_DISAGREE`; votes were `AGREE, DISAGREE, IDLE, DISAGREE, DISAGREE`, and storage stayed `OPEN`.
  Outcome-only still re-ran web/model work in validators, which was unstable on ambiguous claims. The active contract now makes validator equivalence deterministic: validators inspect the leader's returned outcome/quote/reason shape instead of re-fetching/re-prompting.
- Cancel tx `0x234b1c0616e73a865fae1e4014b79b488bf117b4c9c1091c1e5915d535946dd2` on `0xe5cD1E58830C7bE8700a565f1fEaf49dc0e12b6B` stored `paid_to_poster=1.8 GEN`, but explorer/RPC showed `triggered_transactions=[]`.
  The contract balance stayed above `locked + treasury`, so the outbound transfer did not actually materialize. The active contract restores the `_Recipient(Address(...)).emit_transfer(value=...)` interface call used by working examples, with dynamic proxy only as fallback.
- `prove` no longer calls the missing `gl.vm.run_nondet_unsafe`; it uses `gl.vm.run_nondet`.
- There is no `commit_proof` / proof-lock surface.
- CLI write has fee flags but no payable user-value flag, so the transactional back/prove smoke should be done through the wallet UI.
- The previous active contract was `0x5b9DDFdea6Cd444560398A56189250b0b422030d`.
  It incorrectly settled OpenAI/Coinbase proof fixtures as `THIN` because `HTTP 403` returned before trying `gl.nondet.web.render`.
  The current contract tries render for 403/empty/chrome-like pages, keeps 404/5xx as thin refunds, and still treats failed render on forbidden pages as thin.
- The previous active contract was `0x8418053BF408EC23C4E71A9144E93a49F920F4eC`.
  It could still produce `FINALIZED FINISHED_WITH_ERROR` when the AI verifier returned malformed JSON, an unsupported quote, or an unsupported reason.
- The previous active contract was `0x66e2F3E56632bB216Df175158226340619a159C7`.
  It settled verifier-quality failures as `THIN`, but validators only checked the leader result shape.
- The previous active contract was `0xF118F6A0Df9B0480B01932f0D251e268F2C429B5`.
  It made validators independently refetch the source, reject TRUE/FALSE if their fetched excerpt is thin, and require the stored quote to exist in their independently fetched excerpt.
- The previous active contract was `0x1833BC2571945AeA73dD288334B5a78c6b401187`.
  It added the qualified-domain allowlist at `back()` and final-redirect domain checks during `prove()`.
  The current contract keeps that behavior and also accepts positive listing/availability reasons as valid FALSE support when the claim itself says an asset is not available/listed/supported.

## How to run the app

1. `cd web`
2. `npm.cmd run dev`
3. Open `http://localhost:3000`

Both `.env.local` and `web/.env.local` point at the current Studio Next contract.
