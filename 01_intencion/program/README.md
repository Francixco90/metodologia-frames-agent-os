# Program docs

Canonical program documents under `01_intencion/program/`. Grouped by concern.

## Governance & policy

- `ownership-manifest.yml` — one-writer-per-path policy; assigns every governed
  path to a writer (`lead`, `repo`, `brand`, `sources`, `core`, `agents-committee`,
  `skill-foundry`, `web`, `content`, `remotion`, `static-social`, `n8n`, `qa`,
  `governance`, `guardian`). Validated by `scripts/check-ownership.ts`.
- `dag.yml` — the program DAG: packages A00-A13 and gates G00-G17. The source of
  truth for gate sequencing. Validated by `scripts/check-dag.ts`.

## Ledger & budget

- `file-disposition-ledger.yml` — disposition ledger V2: per-file decision,
  ownership resolution, and budget projection (corpus, hard-cap, immutable
  history). Generator: `scripts/generate-file-disposition-ledger.ts`
  (`pnpm ledger:generate`). Validator: `scripts/check-docs.ts`.
- `file-disposition-ledger.md` — human-readable projection of the ledger.

## Scope & architecture

- `formal-scope.md` — engagement scope and boundaries.
- `system-architecture.md` — system architecture overview.
- `requirements-traceability.md` — requirements-to-artifact traceability.
- `test-strategy.md` — testing strategy across unit/contract/integration/e2e.

## Runbook

- `operator-runbook.md` — manual stage-by-stage runbook for the DAG. Gates
  G13-G17 are intentionally manual (fail-closed).

## Content network

- `instagram-content-network-v2.md` — central V2 network document (≤300 lines).
  The only doc validated by `scripts/check-docs.ts` (15 required sections, 8
  workflow IDs, ordering). [CONFIG]
- `instagram-content-creation-network-v3.md` — V3 creation network (companion
  to V2; cross-ref pending).
- `content-atom-graph-v1.md` — V1 content atom graph.

## Token efficiency

- `token-efficiency/` — token-efficiency microprofile bindings.
