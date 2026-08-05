# emil-skills vendor audit — Fase 1F (emil)

> Audit date: 2026-08-04 · Auditor: lead · 1 skill doctrine (8-skill repo),
> MIT · Per-file sha256 in [`source-lock.json`](./source-lock.json).

## Scope

1 design-engineering skill doctrine vendored text-only into
`skills/vendor/emil-skills/` as **reference-only** input for the
locally-authored `design-emil-design-eng` homólogo (Design-OS Fase 2D, H-03
path). 14 text files copied (full repo: LICENSE + README + 8 skills). 0
binaries. Source is **MIT licensed** (verified).

## Source resolution

| skill             | source repo           | commit    | license | source path                                    | files vendored |
| ----------------- | --------------------- | --------- | ------- | ---------------------------------------------- | -------------- |
| `emil-design-eng` | `emilkowalski/skills` | `da80201` | MIT     | `skills/emil-design-eng/` (full repo vendored) | 14             |

- **emil-design-eng** (design engineering): 674-line SKILL.md encoding Emil
  Kowalski's philosophy on UI polish, component design, animation decisions,
  and invisible details. Core tenets: taste is trained (not innate), unseen
  details compound, beauty is leverage. Enforces a Before/After markdown-table
  review format for UI code review.
- 7 sibling skills vendored as reference: `animation-vocabulary` (173),
  `apple-design` (282), `find-animation-opportunities` (132),
  `improve-animations` (101 + AUDIT.md + PLAN-TEMPLATE.md), `pick-ui-library`
  (77), `prototype` (90 + PICKER.md), `review-animations` (112 + STANDARDS.md).
  Animation skills overlap with gsap-skills (Fase 1G); emil homólogo scoped to
  design-engineering doctrine.

## License

Source is **MIT** (Copyright (c) 2026 Emil Kowalski). Verified via LICENSE file
at repo root. MIT permits redistribution and modification with attribution.
Vendored copy retains LICENSE at vendor root (`skills/vendor/emil-skills/LICENSE`).
Homólogo (`design-emil-design-eng`, Fase 2D) derives under
`LicenseRef-MetodologIA-Internal` with `derivation_mode:
clean-room-prose-from-permissive-reference` (MIT-compatible).

## Global audit findings

### 1. License — MIT (verified)

- MIT per `emilkowalski/skills` LICENSE (`MIT License`, `Copyright (c) 2026 Emil Kowalski`).
- LICENSE copied to vendor root. No source-available/NOT-OSI risk.

### 2. Binaries excluded

None. 14 files all UTF-8 text (`.md`). `file` reports 0 binary.

### 3. Secrets / PII / private locators

None. SKILL.md files reference public URLs only (`https://animations.dev/`,
public component-library docs). No credentials, tokens, internal hostnames, PII.

### 4. Network / execution surface

None. emil repo is pure SKILL.md skills (no CLI, no scripts, no package.json).
Vendored as **reference-only** — not executed, not registered, not wired into
any validator. Homólogo `design-emil-design-eng` (Fase 2D) describes the
design-engineering doctrine in prose; `check-skill.mjs` self-contained (no
import of vendor code).

### 5. Content-type verification

14 files UTF-8 text (ASCII subset). 0 binary leaks.

## Per-skill checklist

### emil-design-eng

- [x] License: MIT (verified, LICENSE copied to vendor root)
- [x] Attribution: "Copyright (c) 2026 Emil Kowalski" preserved in LICENSE
- [x] Source commit pinned: `da80201`
- [x] Text-only: 14 files, 0 binaries
- [x] No secrets/PII/private locators
- [x] `execution_status: reference-only-no-auto-execution`
- [x] Per-file sha256 in `source-lock.json`; 8 critical_file_hashes (one SKILL.md per skill)
- [x] Excluded: `.git/`, `.gitignore` only (repo is pure markdown)

## Verdict

**PASS.** 1 design-engineering doctrine, MIT, 14 text files vendored, 0
binaries, 0 secrets. Ready for Fase 2D `design-emil-design-eng` homólogo
derivation (H-03 path, per-skill runtime-boundary receipt, code `EDE`).
