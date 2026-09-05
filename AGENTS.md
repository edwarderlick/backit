# BackIt agent runbook

StudioNet only. Test GEN. No git push unless the human asks.

## Do

- Read `AGENT_LOG.md` first.
- Pin runner `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6` (or the current docs hash — never `test`/`latest`).
- Reconstruct payouts from `get_back` / `get_economics` / `get_credit`.
- After `back()`, take the new id from `list_ids()` diff. Never CASE-0001. Never let the UI assign ids.
- Chain id **61999**. If Stitch copy says 421614, that is wrong.

## Do not

- Courts, dockets, appeals, keepers, deadlines, countdown clocks, leaderboards, passports, validator vote theater.
- Frontend LLM writing the verdict.
- Party-supplied weights.
- Rainline datetime gates.
- Push to GitHub unless asked.

## Commands

```
pytest tests/direct/test_backit.py -v
genvm-lint check contracts/backit.py
genlayer network set studionet
genlayer deploy --contract contracts/backit.py
cd web && npm run dev
```

StudioNet is gasless and rate-limited. Throttle writes. Inspect `genlayer receipt <hash> --stdout --stderr`; FINALIZED ≠ execution success.
