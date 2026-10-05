# BackIt agent runbook

Studio Next only. Test GEN. No git push unless the human asks.

## Do

- Read `AGENT_LOG.md` first.
- Pin runner `py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng` (or the current docs hash — never `test`/`latest`).
- Reconstruct payouts from `get_back` / `get_economics` / `get_credit`.
- After `back()`, take the new id from `list_ids()` diff. Never CASE-0001. Never let the UI assign ids.
- Chain id **61997**. If Stitch copy says 421614, that is wrong.

## Do not

- Courts, dockets, appeals, keepers, deadlines, countdown clocks, leaderboards, passports, validator vote theater.
- Frontend LLM writing the verdict.
- Party-supplied weights.
- Push to GitHub unless asked.

## Commands

```
pytest tests/direct/test_backit.py -v
genvm-lint check contracts/backit.py
node scripts/deploy.mjs
cd web && npm run dev
```

Studio Next uses test GEN and is rate-limited. Throttle writes. Inspect `genlayer receipt <hash> --stdout --stderr`; FINALIZED ≠ execution success.
