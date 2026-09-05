# Change program · frames-consolidation-2026-09

Authority document bound by `change-budget-program-v1.json` (`planRef`). It describes the
one-time consolidation of the private line into the public line and the landing of preserved
uncommitted work, so the per-PR file budget is replaced by an explicitly partitioned program
budget for this branch only. [CONFIG]

## Scope

1. Merge `ba064ac7` (private main) into `3f5b31d8` (public main) with a real merge commit.
2. Land the `wip/*` branches whose cherry-pick applies cleanly and keeps `pnpm verify` green.
3. Regenerate every generated projection instead of hand-editing it.
4. Record dispositions in `01_intencion/program/consolidation-ledger.md`.

## Boundaries

- No publication, no push, no remote creation. Authority mode `LOCAL_SIMULATION`.
- Private canon-v3 code stays out of `main` until it compiles against public contracts.
- Binaries enter only through Git LFS; the budget gate recognises LFS-managed paths.
- Partitions group changes by family; every authored changed path is declared exactly once.
