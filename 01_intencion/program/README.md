# Program docs

Canonical program documents under `01_intencion/program/`. Grouped by concern.

## Governance & policy

- `ownership-manifest.yml` — one-writer-per-path policy; assigns every governed
  path to a writer (`lead`, `repo`, `brand`, `sources`, `core`, `agents-committee`,
  `skill-foundry`, `web`, `content`, `remotion`, `static-social`, `n8n`, `qa`,
  `governance`, `guardian`). Validated by `scripts/check-ownership.ts`.
- `dag.yml` — the program DAG: packages A00-A13 and gates G00-G21 + MW_* (multimedia:
  `MW_CAPABILITY`, `MW_SPEC_APPROVED`, `MW_ASSET_REVIEW`, `MW_EDIT_APPROVED`,
  `MW_DISTRIBUTION_AUTHORIZED`). The source of truth for gate sequencing. Validated
  by `scripts/check-dag.ts`. G13-G17 manual fail-closed; G18-G21 automated
  (env drift, eval suite, tool grants, atemporal naming).

## Ledger & budget

- `file-disposition-ledger.yml` — disposition ledger V2: per-file decision,
  ownership resolution, and budget projection (corpus, hard-cap, immutable
  history). Generator: `scripts/generate-file-disposition-ledger.ts`
  (`pnpm ledger:generate`). Validator: `scripts/check-docs.ts`.
- `file-disposition-ledger.md` — human-readable projection of the ledger.
- `execution-ledger.md` — execution ledger: per-package execution status and
  progression tracking.

## Scope & architecture

- `formal-scope.md` — engagement scope and boundaries.
- `system-architecture.md` — system architecture overview.
- `requirements-traceability.md` — requirements-to-artifact traceability.
- `test-strategy.md` — testing strategy across unit/contract/integration/e2e.
- `registry-reconcile-fase3.md` — registry reconciliation Fase 3 (v2 ↔ v3,
  0 orphans, 0 cross-registry dupes).

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

## ADRs

- `../adrs/0001-0020-decisions.md` — foundational decisions.
- `../adrs/0021-0026-renderer-adapters.md` — renderer adapters.
- `../adrs/0027-atemporal-naming.md` — atemporal naming (Fase 7 densification 81→152 skills).

## Token efficiency

- `token-efficiency/` — token-efficiency microprofile bindings.
