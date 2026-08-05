# anthropics-skills vendor audit — Fase 1D

> Audit date: 2026-08-04 · Auditor: lead · 1 skill, Apache-2.0 · Per-file sha256
> in [`source-lock.json`](./source-lock.json).

## Scope

1 skill vendored text-only into `skills/vendor/anthropics-skills/frontend-design/`
as **reference-only** input for the locally-authored `design-frontend-design`
homólogo (Design-OS Fase 2B, H-03 path). 2 text files copied, 0 binaries excluded.
Source is **Apache-2.0 licensed** (verified via in-folder `LICENSE.txt`).

## Source resolution

| skill             | source repo         | commit    | license    | source path               | files vendored             |
| ----------------- | ------------------- | --------- | ---------- | ------------------------- | -------------------------- |
| `frontend-design` | `anthropics/skills` | `b29e7cf` | Apache-2.0 | `skills/frontend-design/` | 2 (SKILL.md + LICENSE.txt) |

- **frontend-design** (visual-design guidance): single SKILL.md (55 lines) +
  LICENSE.txt. Prose-only design-lead guidance for distinctive, intentional
  visual design (palette, typography, layout). No code, no CLI, no network
  surface.

## License

Source is **Apache-2.0** (Apache License Version 2.0 in `LICENSE.txt`).
Verified via `skills/frontend-design/LICENSE.txt`. Apache-2.0 permits
redistribution and modification with attribution. Vendored copy retains the
Apache-2.0 LICENSE.txt at the skill folder + a copy at the vendor root
(`skills/vendor/anthropics-skills/LICENSE`). Homólogo (`design-frontend-design`,
Fase 2B) derives under `LicenseRef-MetodologIA-Internal` with `derivation_mode:
clean-room-prose-from-permissive-reference` (Apache-2.0-compatible; attribution
preserved in LINEAGE.yml).

## Global audit findings

### 1. License — Apache-2.0 (verified)

- Apache-2.0 per `skills/frontend-design/LICENSE.txt` (Apache License, Version 2.0).
- LICENSE.txt copied to skill folder + vendor root.
- No source-available / NOT-OSI risk. No license addendum required.

### 2. Binaries excluded

None. `skills/frontend-design/` contains only `SKILL.md` (UTF-8 text, 55 lines) +
`LICENSE.txt`. `file` reports no binary/executable/image/font. The anthropics/skills
repo root contains 17 skill folders (algorithmic-art, brand-guidelines,
canvas-design, doc-coauthoring, docx, frontend-design, internal-comms,
mcp-builder, pdf, pptx, skill-creator, slack-gif-creator, theme-factory,
web-artifacts-builder, webapp-testing, xlsx) — **only `frontend-design/`
vendored**. Doc skills (docx/pdf/pptx/xlsx) source-available excluded by design.

### 3. Secrets / PII / private locators

None. SKILL.md references no URLs, credentials, tokens, internal hostnames, or
PII. Pure prose design guidance.

### 4. Network / execution surface

None. frontend-design is prose-only design guidance. No `npx`, no CLI, no
network fetch, no install. Vendored as **reference-only** — not executed, not
registered, not wired into any validator. Homólogo `design-frontend-design`
(Fase 2B) reproduces the design-lead guidance as clean-room prose, fail-closed.

### 5. Content-type verification

SKILL.md + LICENSE.txt are UTF-8 text. 0 binary leaks.

## Per-skill checklist

### frontend-design

- [x] License: Apache-2.0 (verified, LICENSE.txt copied to skill folder + vendor
      root)
- [x] Attribution: "Copyright (c) 2026 Anthropic, Inc." preserved in LICENSE.txt
- [x] Source commit pinned: `b29e7cf65e5cb78a5ac33d582270551bc74a14eb`
- [x] Text-only: 2 files (SKILL.md + LICENSE.txt), 0 binaries
- [x] No secrets/PII/private locators
- [x] `execution_status: reference-only-no-auto-execution`
- [x] Per-file sha256 in `source-lock.json`:
      `SKILL.md = 1608ea77fbb6fc30d13a97d12cfa8ebf31358d40f0dd97beed24829d6b3f45dd`
- [x] Excluded: 16 other anthropics/skills folders (doc skills docx/pdf/pptx/xlsx
      source-available, algorithmic-art, brand-guidelines, canvas-design, etc.)

## Verdict

**PASS.** 1 skill, Apache-2.0, 2 text files vendored, 0 binaries, 0 secrets. Ready
for Fase 2B `design-frontend-design` homólogo derivation (H-03 path, per-skill
runtime-boundary).
