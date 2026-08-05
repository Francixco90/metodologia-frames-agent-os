# superpowers vendor architecture — Fase 1N

> Vendor root: `skills/vendor/superpowers/` · 14 skills · MIT · Reference-only.

## Layout

14 skill dirs under `skills/vendor/superpowers/`, each with SKILL.md; several
with supporting scripts (text reference, non-executable):

- `brainstorming/`: SKILL.md + scripts/{start-server.sh, stop-server.sh,
  server.cjs, helper.js, frame-template.html}
- `systematic-debugging/`: SKILL.md + condition-based-waiting-example.ts +
  find-polluter.sh
- `subagent-driven-development/`: SKILL.md + scripts/{review-package,
  sdd-workspace, task-brief}
- `writing-skills/`: SKILL.md + render-graphs.js + graphviz-conventions.dot
- remaining 10 skills: SKILL.md only

51 files total (50 skill files + 1 LICENSE at vendor root). File types: .md, .ts,
.sh, .js, .cjs, .html, .dot.

## Source map

| source repo        | commit     | license | source path | destination                  | files        |
| ------------------ | ---------- | ------- | ----------- | ---------------------------- | ------------ |
| `obra/superpowers` | `44c9b2d6` | MIT     | `skills/`   | `skills/vendor/superpowers/` | 50 + LICENSE |

Source commit: `44c9b2d6e889982ac18c27d05a19fefe335194e1`. LICENSE at source root
("Copyright (c) 2025 Jesse Vincent") — copied to vendor root.

## Toolchain isolation

Vendored skills are **post-closure reference-only** and excluded from the
toolchain:

- **tsconfig.json**: `"exclude": [..., "skills/vendor/**"]` — not typechecked
  (.ts files not compiled; .js/.cjs not in TS scope).
- **.prettierignore**: `skills/vendor/**` — not formatted.
- **eslint**: vendor dirs excluded.
- **check-privacy.ts**: `isVendor()` bypass — not privacy-scanned.
- **reconcile-skill-registries.ts**: `if (name === 'vendor') return false` —
  vendor dirs bypass reconcile gate RCN-009.
- **Shell/JS scripts NOT executable**: vendored as text reference; `chmod -x`
  applied to .sh files; not invoked by any validator or runtime.
- **Post-closure no baseline shift**: ledger regen absorbs new vendor files
  without shifting authored-corpus baseline.

## Homólogo wiring

All 14 skills → dev-* family (Fase 2J-2M, H-03 path):

| vendored skill                   | MetodologIA homólogo                 | validator | registry                         | per-skill runtime-boundary      |
| -------------------------------- | ------------------------------------ | --------- | -------------------------------- | ------------------------------- |
| `brainstorming`                  | `dev-brainstorming`                  | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `dispatching-parallel-agents`    | `dev-dispatching-parallel-agents`    | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `executing-plans`                | `dev-executing-plans`                | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `finishing-a-development-branch` | `dev-finishing-branch`               | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `receiving-code-review`          | `dev-receiving-code-review`          | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `requesting-code-review`         | `dev-requesting-code-review`         | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `subagent-driven-development`    | `dev-subagent-driven-development`    | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `systematic-debugging`           | `dev-systematic-debugging`           | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `test-driven-development`        | `dev-test-driven-development`        | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `using-git-worktrees`            | `dev-using-git-worktrees`            | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `using-superpowers`              | `dev-using-superpowers`              | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `verification-before-completion` | `dev-verification-before-completion` | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `writing-plans`                  | `dev-writing-plans`                  | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `writing-skills`                 | `dev-writing-skills`                 | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |

### Homólogo derivation contract (per skill)

- `content_origin: locally_authored_adaptation`
- `derivation_mode: clean-room-prose-from-permissive-reference`
- `external_fragments_reused: false`
- `license: LicenseRef-MetodologIA-Internal`
- `metadata.model_agnostic: true`
- `publication_authority: false`
- `authority_refs`: `skills/vendor/superpowers/<skill>/SKILL.md` (read-only) +
  `core/contracts/creation-v3.ts` (H-03 contract)
- SKILL.md line: `Derivada de <skill> (obra/superpowers, MIT)`

## License guard

- Vendored skills are **MIT** (LICENSE at source root, copied to vendor root).
- Homólogos are **clean-room prose adaptations** (`LicenseRef-MetodologIA-Internal`,
  `derivation_mode: clean-room-prose-from-permissive-reference`,
  `external_fragments_reused: false`). MIT attribution preserved in LINEAGE.yml.
- `check-skill.mjs` self-contained (no import of vendor code) → no viral license
  surface.
- Vendor copy (incl. scripts) excluded from toolchain → not typechecked, not
  linted, not executed, not in `verify:skills`.

Full lock: [`source-lock.json`](./source-lock.json).
