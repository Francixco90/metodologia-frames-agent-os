# Loose-Task Policy — R3-LOOSE First-Class

**Scope**: `04_estado/tasks/TASK-loose-*` (31 backfilled loose tasks as of 2026-08-05). [CONFIG]
**Source**: plan A5 (gap closure), SPEC 2.0.0-candidate gap #5. [DOC]

## Principle

Loose tasks are **first-class** objects in the harness. The `R3-LOOSE` route is a valid, permanent minting route — not a backlog state to be drained. Project binding (`project_id`) is **opt-in**, not the default, and never a precondition for a loose task to be valid, advance through the state machine, or close at a gate. [CONFIG]

## What changed (A5)

- `created_from_route`: normalized from `R4` (the backfill route that produced them) to `R3-LOOSE` (the canonical first-class loose route). The 31 tasks now carry the route that should have minted them. [CONFIG]
- `evidence_tags.historical`: changed from `DOC` to `coverage_gap` for every task whose `meta/backfill-notes.yml` records an `inferred_state`. Rationale (fail-closed): an inferred state has no ground-truth source — the tag must mark the gap, not claim a clean documentation trail. [CONFIG]
- `meta/backfill-notes.yml.provenance`: appended `triage_r3_loose` to record the normalization. Idempotent. [CONFIG]
- `project_id`: intentionally left `null`. Loose tasks stay unbound. [CONFIG]

## What did NOT change

- Task ids, objectives, write-sets, states, gate targets — untouched.
- The task counter (`task-counter.yml`) — loose count already accepted ≥ project count.
- Doctor `checkTaskCounter` — no change required.

## Operational rules

1. A loose task may advance `INTAKE → ESPECIFICADO → COMPILADO → EVALUADO → ENTREGADO` exactly like a project-bound task, subject to the same state-machine invariants (`02_proceso/core/state-machine/task-machine.ts`). [CÓDIGO]
2. Manual fail-closed gates (G13–G17, `MW_DISTRIBUTION_AUTHORIZED`) still require explicit `HUMAN_APPROVED` — being loose does NOT bypass human gates. [CONFIG]
3. A loose task MAY be promoted to project-bound later by setting `project_id` to a registered project slug. This is an opt-in edit, recorded in `PROGRESS.md`, and never automatic. [CONFIG]
4. New loose tasks minted after this policy take `R3-LOOSE` directly (not `R4`). `R4` remains reserved for backfill/migration scenarios. [CONFIG]
5. The `coverage_gap` tag on `historical` is honest: it tells a future reviewer the state was inferred, not sourced. A human amending the state SHOULD replace `coverage_gap` with the appropriate evidence tag (`DOC`/`CÓDIGO`/`CONFIG`) once a ground-truth source is established. [CONFIG]

## Verification

- `pnpm eval:run --only H-E010` — scans for R3-LOOSE tasks with `project_id: null`; passes once the normalization lands (was `SKIPPED` before A5 because all 31 carried `R4`). [CÓDIGO]
- `node --import tsx 05_verificacion/scripts/triage-loose-tasks.ts --dry-run` — reports `changed=0` after the normalization is applied (idempotent). [CÓDIGO]

## Risks

- **R4 semantics**: `R4` (backfill) is still a valid enum value for future migration batches. This policy does not retire `R4`; it only re-homes the 31 historical loose tasks to `R3-LOOSE` because that is the route that should have minted them. [INFERENCIA]
- **coverage_gap proliferation**: 31 tasks now carry `coverage_gap`. This is honest documentary debt, not a regression — it surfaces the inferred-state gap rather than hiding it behind a clean `DOC` tag. [CONFIG]