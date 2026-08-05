# genjutsu vendor audit — Fase 1O

> Audit date: 2026-08-04 · Auditor: lead · 17 skills, MIT · Per-file sha256 in
> [`source-lock.json`](./source-lock.json).

## Scope

17 skills vendored text-only into `skills/vendor/genjutsu/` as **reference-only**
input for locally-authored design-* homólogos (expansion Fase 2F-2H, design-*
family, H-03 path). 90 skill files copied (17 SKILL.md + supporting .py scripts

- .csv data) + LICENSE, 0 binaries excluded. Source is **MIT licensed** (LICENSE
  at repo root, "Copyright (c) 2026 Adrien Thevon").

## Source resolution

| source repo        | commit     | license | source path | skills vendored |
| ------------------ | ---------- | ------- | ----------- | --------------- |
| `AThevon/genjutsu` | `08a792f6` | MIT     | `skills/`   | 17 (90 files)   |

Structure: `skills/_jutsu/<sub-skill>/` (15 sub-skills) + `skills/cast/` +
`skills/paint/`.

| skill (source path)            | description                    | homólogo (Fase 2)                                 |
| ------------------------------ | ------------------------------ | ------------------------------------------------- |
| `_jutsu/canvas-generative`     | canvas generative              | `design-canvas-generative`                        |
| `_jutsu/compose-graphics`      | compose graphics               | `design-compose-graphics`                         |
| `_jutsu/compose-motion`        | compose motion                 | `design-compose-motion`                           |
| `_jutsu/compose-multiplatform` | compose multiplatform          | `design-compose-multiplatform`                    |
| `_jutsu/css-native`            | css native                     | `design-css-native`                               |
| `_jutsu/design-audit`          | design audit                   | `design-audit-genjutsu`                           |
| `_jutsu/desktop-principles`    | desktop principles             | `design-desktop-principles`                       |
| `_jutsu/framer-motion`         | framer motion                  | `design-framer-motion`                            |
| `_jutsu/gsap`                  | gsap motion                    | `design-genjutsu-gsap-motion` (distinct from #54) |
| `_jutsu/mobile-principles`     | mobile principles              | `design-mobile-principles`                        |
| `_jutsu/motion-principles`     | motion principles              | `design-motion-principles`                        |
| `_jutsu/swiftui-graphics`      | swiftui graphics               | `design-swiftui-graphics`                         |
| `_jutsu/swiftui-motion`        | swiftui motion                 | `design-swiftui-motion`                           |
| `_jutsu/threejs-r3f`           | threejs r3f                    | `design-threejs-r3f`                              |
| `_jutsu/ui-ux-pro-max`         | ui-ux pro max (scripts + data) | `design-genjutsu-uiux` (distinct from #52)        |
| `cast`                         | cast                           | `design-cast`                                     |
| `paint`                        | paint                          | `design-paint`                                    |

## License

Source is **MIT** (LICENSE file at repo root, "Copyright (c) 2026 Adrien
Thevon"). MIT permits redistribution and modification with attribution.
Homólogos derive under `LicenseRef-MetodologIA-Internal` with `derivation_mode:
clean-room-prose-from-permissive-reference` (MIT-compatible; attribution
preserved in LINEAGE.yml).

## Global audit findings

### 1. License — MIT (LICENSE file at root)

- MIT per LICENSE file at repo root ("Copyright (c) 2026 Adrien Thevon").
- OSI-approved, no source-available risk.

### 2. Binaries excluded

None. All 90 skill files are UTF-8 text: SKILL.md (markdown), `_jutsu/ui-ux-pro-
max/scripts/*.py` (Python), `_jutsu/ui-ux-pro-max/data/*.csv` (CSV data). `file`
reports no binary/executable/image/font in the vendored set.

### 3. Secrets / PII / private locators

None. Skill files reference public design concepts (motion principles, UI/UX
guidelines, design systems, CSV data for UI components). No credentials, tokens,
internal hostnames, or PII.

### 4. Network / execution surface

**Present but contained.** `_jutsu/ui-ux-pro-max/scripts/*.py` are Python scripts
that could process CSV data / validate design systems. Vendored as
**reference-only** — Python scripts are NOT executed, NOT made executable, NOT
registered, NOT wired into any validator. Homólogos (design-* family) reproduce
the capability as clean-room prose; any executable capability is fail-closed
(describe in prose, gate behind user confirmation). No `npx` in vendored text.

### 5. Content-type verification

90 skill files (md + py + csv) + LICENSE are UTF-8 text. 0 binary leaks.

## Duplicate handling (risk #4)

`_jutsu/gsap` + `_jutsu/ui-ux-pro-max` sub-skills **duplicate** standalone vendor
PRs #54 (gsap-skills) and #52 (ui-ux-pro-max). Per plan: vendor all 17 as-is
(reference-only); homólogos get **distinct names** (`design-genjutsu-gsap-motion`,
`design-genjutsu-uiux`) and LINEAGE maps to the correct sub-skill path within
genjutsu. No conflict — distinct homólogo identifiers, distinct vendor paths.

## Per-skill checklist (summary)

All 17 skills satisfy: MIT license + attribution preserved, source commit pinned
`08a792f6403104a231fc3f9b1612577698d6e03d`, text-only (md + py + csv), no
secrets/PII, `execution_status: reference-only-no-auto-execution`, per-file
sha256 in `source-lock.json`. Python scripts vendored as non-executable text
reference.

## Verdict

**PASS.** 17 skills, MIT (LICENSE at root), 91 text files vendored (90 skill
files + LICENSE), 0 binaries, 0 secrets. Python scripts contained as
non-executable text reference. Duplicate sub-skills (gsap, ui-ux-pro-max) handled
with distinct homólogo names. Ready for design-* homólogos (Fase 2F-2H, H-03
path).
