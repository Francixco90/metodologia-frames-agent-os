# design-dna vendor audit — Fase 1I

> Audit date: 2026-08-04 · Auditor: lead · 1 skill, MIT · Per-file sha256 in
> [`source-lock.json`](./source-lock.json).

## Scope

1 skill vendored text-only into `skills/vendor/design-dna/design-dna/` as
**reference-only** input for the locally-authored `design-dna` homólogo
(expansion Fase 2I, design-* family, H-03 path). 3 text files copied (SKILL.md +
2 references), 1 binary excluded. Source is **MIT licensed** (LICENSE file at
repo root, "Copyright (c) 2026 the design-dna authors").

## Source resolution

| skill        | source repo         | commit    | license | source path | files vendored              |
| ------------ | ------------------- | --------- | ------- | ----------- | --------------------------- |
| `design-dna` | `zanwei/design-dna` | `9d9d795` | MIT     | `/` (root)  | 3 (SKILL.md + 2 references) |

- **design-dna** (design-token / brand-DNA generation): SKILL.md at repo root
  (not in `skills/` folder). `references/generation-guide.md` + `references/schema.md`
  vendored as support text. Generates brand-consistent design tokens from
  natural-language brand descriptions. No CLI, no network surface in vendored
  text.

## License

Source is **MIT** (LICENSE file at repo root, "Copyright (c) 2026 the design-dna
authors"). MIT permits redistribution and modification with attribution. Homólogo
(`design-dna`, Fase 2I) derives under `LicenseRef-MetodologIA-Internal` with
`derivation_mode: clean-room-prose-from-permissive-reference` (MIT-compatible;
attribution preserved in LINEAGE.yml).

## Global audit findings

### 1. License — MIT (LICENSE file at root)

- MIT per LICENSE file at repo root ("Copyright (c) 2026 the design-dna authors").
- No source-available / NOT-OSI risk. MIT is OSI-approved.

### 2. Binaries excluded

`docs/example-style-transfer.png` (binary image) — **excluded**. Only UTF-8 text
copied (SKILL.md + 2 reference markdown files). README locale variants excluded
(not skill content).

### 3. Secrets / PII / private locators

None. SKILL.md + references reference public concepts (design tokens, brand
schemas). No credentials, tokens, internal hostnames, or PII.

### 4. Network / execution surface

None. design-dna is prose-only design-token generation guidance. No `npx`, no CLI,
no network fetch, no install in vendored text. Vendored as **reference-only** — not
executed, not registered, not wired into any validator. Homólogo `design-dna`
(Fase 2I, design-* family) reproduces the capability as clean-room prose.

### 5. Content-type verification

SKILL.md + 2 references are UTF-8 text. 0 binary leaks (PNG excluded).

## Per-skill checklist

### design-dna

- [x] License: MIT (LICENSE file at repo root)
- [x] Attribution: "Copyright (c) 2026 the design-dna authors" preserved
- [x] Source commit pinned: `9d9d79568df31cd846681f89fd3be1c3ce0c2aff`
- [x] Text-only: 3 files (SKILL.md + 2 references), 0 binaries (PNG excluded)
- [x] No secrets/PII/private locators
- [x] `execution_status: reference-only-no-auto-execution`
- [x] Per-file sha256 in `source-lock.json`:
      `SKILL.md = c04472d2cced644f48485f630cb48e2f496624c65b9f0e5f28aec9af153c7fbf`
- [x] Excluded: `docs/example-style-transfer.png` (binary), README locale variants

## Verdict

**PASS.** 1 skill, MIT (LICENSE at root), 4 text files vendored (SKILL.md + 2
references + LICENSE), 0 binaries (PNG excluded), 0 secrets. Ready for `design-dna`
homólogo (Fase 2I, design-* family, H-03 path).
