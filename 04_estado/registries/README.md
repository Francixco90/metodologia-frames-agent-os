# Registries

`registries/` is the governed-asset store: the canonical YAML/JSON registers that
the DAG, agents, renderers and checks resolve against. Every subregistry is
owned under the one-writer-per-path policy in
`01_intencion/program/ownership-manifest.yml` and validated by a dedicated `scripts/check-*`
script (run via `pnpm check:repo`, unless noted).

| Subregistry          | Owner                       | Canonical files                                                                                            | Validator                                            |
| -------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `agents/`            | agents-committee            | `agent-registry-v2.yml`, `base-contract-v2.yml`                                                            | `check-orchestration.ts`                             |
| `brand/`             | brand                       | `brand-profile-v2.yml`, `voice-profile-v2.yml`, `source-bundle-v1.yml`, `brand-adaptation-decision-v1.yml` | `check-brand.ts`                                     |
| `channels/`          | brand                       | `instagram-profile-v1.yml`                                                                                 | `check-brand.ts`                                     |
| `claims/`            | sources                     | `claim-registry.yml`                                                                                       | `check-claims.ts`                                    |
| `components/`        | remotion                    | `component-registry.yml`                                                                                   | via `pnpm remotion:validate` (G12)                   |
| `content-types/`     | content                     | `instagram-workflow-matrix.yml`                                                                            | `check-content-matrix.ts`, `check-carousel.ts`       |
| `contributions/`     | _unassigned (post-closure)_ | `entries/`, `schemas/`                                                                                     | `pnpm verify:contributions`                          |
| `memory/`            | lead                        | `memory-policy.yml`                                                                                        | `check-memory.ts`                                    |
| `notebooks/`         | sources                     | `notebook-registry.yml`, `binding-contract.yml`, `work-unit-binding-contract.yml`                          | `check-notebooklm.ts`                                |
| `projects/`          | lead                        | `project-registry.yml`                                                                                     | `check-projects.ts`                                  |
| `renderers/`         | remotion                    | `renderer-capability-registry-v1.yml`                                                                      | via `pnpm remotion:validate` (G12)                   |
| `skills/`            | skill-foundry               | `skill-registry.yml`, `creation-v3-skill-registry.yml`, `lifecycle-contract.yml`                           | `check-instagram-v2-skills.ts`, `pnpm verify:skills` |
| `sources/`           | sources                     | `source-registry.yml`, `lifecycle-contract.yml`, `canonical-source-gaps.yml`                               | `check-sources.ts`                                   |
| `visual-references/` | _unassigned (post-closure)_ | `visual-reference-register-v1.jsonl`                                                                       | `check-visual-reference-register.mjs`                |

[CONFIG] Owners resolved from `01_intencion/program/ownership-manifest.yml`.
`contributions/` and `visual-references/` were added after the V2 closure commit
and are not yet assigned a writer; they are still validated by their checks.

## `tasks/`

Append-only task-counter registry and the source of truth for the task-id minter
(S8). Holds `task-counter.yml`, the monotonic counter that backs `TASK-{slug}-NNN`
and `TASK-LOOSE-{NNN}` issuance.

- `task-counter.yml` — `schema_version: 1`, `registry_id: task-counter-v1`,
  `mutation_policy: append-only-records-and-events`. Tracks `project_sequences`
  (map `project_slug -> last NNN issued`) and `loose_sequence` (last NNN for
  `TASK-LOOSE-{NNN}`). Starts empty (`project_sequences: {}`, `loose_sequence: 0`).
- Invariant: append-only. Counters move forward only; never decrement or rewrite
  issued sequences. The minter reads, increments, and appends an event record per
  issuance.

The physical task records live under `04_estado/tasks/` (committed via
`.gitkeep`), surfaced at the repo root through the retro-symlink
`tasks -> 04_estado/tasks`.
