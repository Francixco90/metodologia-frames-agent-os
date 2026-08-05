# Design-OS Fase 1F (emil) — verification report

> Date: 2026-08-04 · Branch: `feat/vendor-emil-extract` · Base: `b55a14d`
> (post-PR #50). 1 source, MIT.

## Objective

Vendor emil-design-eng doctrine (MIT) as text-only, reference-only input for
Fase 2D `design-emil-design-eng` homólogo (H-03 path). No execution, no
registration, no runtime dependency.

## What was done

1. Verified source + license: `emilkowalski/skills` (MIT, Copyright (c) 2026
   Emil Kowalski) via LICENSE at repo root.
2. Cloned @ `da80201`.
3. Audited structure: 8 skills (emil-design-eng 674 lines + 7 animation/design
   siblings), LICENSE, README. 15 files total in repo (14 vendored excl .gitignore).
4. Copied text-only (full repo) to `skills/vendor/emil-skills/` (exclude
   `.git/`, `.gitignore`). LICENSE retained at vendor root.
5. Binary scan: 0 binary/image/font/compressed. All 14 files UTF-8 text.
6. Generated `docs/emil-skills/source-lock.json` — 1 vendor entry, 14 files,
   8 critical_file_hashes (one SKILL.md per skill), MIT attribution, known
   risks, update procedure.
7. Wrote `docs/emil-skills/audit-report.md` + `architecture.md`.

## Inventory

- 1 vendor root `skills/vendor/emil-skills/` (14 text files).
- `docs/emil-skills/`: `source-lock.json`, `audit-report.md`, `architecture.md`,
  `verification-report.md` (this file).

### Files vendored (critical; full per-file sha256 in source-lock.json)

| path                                       | sha256                                                             |
| ------------------------------------------ | ------------------------------------------------------------------ |
| `skills/vendor/emil-skills/LICENSE`        | `4ff5bdb7887ec1435c9cab0e8d1a7caee704d894d65c2a008ccc68b1cc2f260b` |
| `.../skills/emil-design-eng/SKILL.md`      | (see source-lock.json)                                             |
| `.../skills/apple-design/SKILL.md`         | (see source-lock.json)                                             |
| `.../skills/animation-vocabulary/SKILL.md` | (see source-lock.json)                                             |

## Gates

Vendor excluded from toolchain (`skills/vendor/**`). `verify:skills`
unaffected (vendor bypasses reconcile RCN-009). Ledger 387/387 unchanged
(vendors not authored-eligible).
Run (pending): `pnpm check:repo && pnpm verify:skills && pnpm typecheck &&
pnpm lint && pnpm test && pnpm format:check && pnpm ledger:generate`.

## Risks

- 7 sibling skills are animation/design reference (overlap with gsap-skills);
  emil homólogo scoped to design-engineering doctrine (emil-design-eng).
- No execution surface (pure markdown); no CLI/scripts to gate.

## Next gate

Fase 2D — `design-emil-design-eng` homólogo: SKILL.md + LINEAGE.yml + fixtures

- check-skill.mjs + runtime-boundary.yml, H-03 entry (code `EDE`), 4
  append-only events, hashes, baseline update + ledger regen.
