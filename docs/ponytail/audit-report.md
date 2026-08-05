# ponytail vendor audit — Fase 1L

> Audit date: 2026-08-04 · Auditor: lead · 6 skills, MIT · Per-file sha256 in
> [`source-lock.json`](./source-lock.json).

## Scope

6 skills vendored text-only into `skills/vendor/ponytail/` as **reference-only**
input for locally-authored dev-* homólogos (expansion Fase 2J-2M, dev-* family,
H-03 path). 6 SKILL.md files copied + LICENSE, 0 binaries excluded. Source is
**MIT licensed** (LICENSE at repo root, "Copyright (c) 2026 DietrichGebert").

## Source resolution

| source repo               | commit     | license | source path | skills vendored |
| ------------------------- | ---------- | ------- | ----------- | --------------- |
| `DietrichGebert/ponytail` | `16f29800` | MIT     | `skills/`   | 6               |

| skill             | description                           | homólogo (Fase 2)     |
| ----------------- | ------------------------------------- | --------------------- |
| `ponytail`        | YAGNI "laziest senior dev" core skill | `dev-ponytail`        |
| `ponytail-review` | code review                           | `dev-ponytail-review` |
| `ponytail-audit`  | audit                                 | `dev-ponytail-audit`  |
| `ponytail-debt`   | tech debt                             | `dev-ponytail-debt`   |
| `ponytail-gain`   | gain/leverage                         | `dev-ponytail-gain`   |
| `ponytail-help`   | help                                  | `dev-ponytail-help`   |

## License

Source is **MIT** (LICENSE file at repo root, "Copyright (c) 2026 DietrichGebert").
MIT permits redistribution and modification with attribution. Homólogos derive
under `LicenseRef-MetodologIA-Internal` with `derivation_mode:
clean-room-prose-from-permissive-reference` (MIT-compatible; attribution
preserved in LINEAGE.yml).

## Global audit findings

### 1. License — MIT (LICENSE file at root)

- MIT per LICENSE file at repo root ("Copyright (c) 2026 DietrichGebert").
- OSI-approved, no source-available risk.

### 2. Binaries excluded

None. All 6 skill dirs contain only `SKILL.md` (UTF-8 text). `file` reports no
binary/executable/image/font. Repo also has `.openclaw/skills/` duplicates and
locale READMEs — **NOT vendored** (only canonical `skills/` copied).

### 3. Secrets / PII / private locators

None. SKILL.md files reference public dev-workflow concepts (YAGNI, code review,
tech debt). No credentials, tokens, internal hostnames, or PII.

### 4. Network / execution surface

None. ponytail skills are prose-only dev-workflow guidance. No `npx`, no CLI, no
network fetch, no install. Vendored as **reference-only** — not executed, not
registered, not wired into any validator. Homólogos (dev-* family) reproduce the
guidance as clean-room prose.

### 5. Content-type verification

6 SKILL.md + LICENSE are UTF-8 text. 0 binary leaks.

## Per-skill checklist (summary)

All 6 skills satisfy: MIT license + attribution preserved, source commit pinned
`16f29800fd2681bdf24f3eb4ccffe38be3baec6b`, text-only (SKILL.md only), no
secrets/PII, `execution_status: reference-only-no-auto-execution`, per-file
sha256 in `source-lock.json`. Excluded: `.openclaw/skills/` duplicates, locale
READMEs.

## Verdict

**PASS.** 6 skills, MIT (LICENSE at root), 7 text files vendored (6 SKILL.md +
LICENSE), 0 binaries, 0 secrets. Ready for dev-* homólogos (Fase 2J-2M, H-03
path).
