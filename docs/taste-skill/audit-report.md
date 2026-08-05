# taste-skill vendor audit — Fase 1E

> Audit date: 2026-08-04 · Auditor: lead · 13 skills, MIT · Per-file sha256 in
> [`source-lock.json`](./source-lock.json).

## Scope

13 skills vendored text-only into `skills/vendor/taste-skill/` as
**reference-only** input for locally-authored homólogos (Design-OS Fase 2B-2E +
expansion, H-03 path). 16 text files copied (13 SKILL.md + 1 DESIGN.md + LICENSE +
llms.txt), 0 binaries excluded. Source is **MIT licensed** (verified via repo
root `LICENSE`).

Note: original Design-OS plan assumed 4 taste variants; actual repo contains 13
skills. User decision "homologue every skill" applies → all 13 vendored.

## Source resolution

| skill (folder)             | install name               | lines | capability                             |
| -------------------------- | -------------------------- | ----- | -------------------------------------- |
| `brandkit`                 | brandkit                   | 798   | premium brand-kit image generation     |
| `brutalist-skill`          | industrial-brutalist-ui    | 92    | brutalist/tactical UI                  |
| `gpt-tasteskill`           | gpt-taste                  | 74    | AWWWARDS-level design engineering      |
| `image-to-code-skill`      | image-to-code              | 1228  | image-first website design-to-code     |
| `imagegen-frontend-mobile` | imagegen-frontend-mobile   | 1465  | mobile app image direction             |
| `imagegen-frontend-web`    | imagegen-frontend-web      | 987   | frontend image direction               |
| `minimalist-skill`         | minimalist-ui              | 85    | minimalist UI                          |
| `output-skill`             | full-output-enforcement    | 49    | LLM output enforcement (dev-workflow)  |
| `redesign-skill`           | redesign-existing-projects | 178   | redesign existing projects             |
| `soft-skill`               | high-end-visual-design     | 98    | high-end agency design                 |
| `stitch-skill`             | stitch-design-taste        | 184   | semantic design system (Google Stitch) |
| `taste-skill-v1`           | design-taste-frontend-v1   | 226   | v1 taste-skill (backward-compat)       |
| `taste-skill`              | design-taste-frontend      | 1206  | v2 default anti-slop frontend          |

All from `leonxlnx/taste-skill@e988add`, MIT.

## License

Source is **MIT** (`MIT License`, `Copyright (c) 2026 Leonxlnx` in repo root
`LICENSE`). MIT permits redistribution and modification with attribution. LICENSE
copied to vendor root (`skills/vendor/taste-skill/LICENSE`). Homólogos derive
under `LicenseRef-MetodologIA-Internal` with `derivation_mode:
clean-room-prose-from-permissive-reference` (MIT-compatible; attribution preserved
in LINEAGE.yml).

## Global audit findings

### 1. License — MIT (verified)

- MIT per repo root `LICENSE` (`MIT License`, `Copyright (c) 2026 Leonxlnx`).
- LICENSE copied to vendor root.
- No source-available / NOT-OSI risk.

### 2. Binaries excluded

None vendored. Repo contains `assets/*.webp`, `*.png`, `*.svg`,
`examples/*.webp`, `scripts/*.mjs`, `.github/`, `.claude-plugin/`,
`research/laziness/**` — **all excluded**. Only `skills/*/SKILL.md` (13) +
`skills/stitch-skill/DESIGN.md` + `skills/llms.txt` + `LICENSE` copied. `file`
reports all 16 vendored files as UTF-8 text.

### 3. Secrets / PII / private locators

None. SKILL.md files are prose design guidance; reference public frameworks
only (GSAP, Google Stitch). No credentials, tokens, internal hostnames, or PII.

### 4. Network / execution surface

None. All 13 skills are prose-only design/image-direction guidance. No `npx`,
no CLI, no network fetch, no install. Vendored as **reference-only** — not
executed, not registered, not wired into any validator. Homólogos reproduce
guidance as clean-room prose, fail-closed.

### 5. Content-type verification

All 16 files UTF-8 text. 0 binary leaks.

## Per-skill checklist

All 13 skills:

- [x] License: MIT (verified, LICENSE copied to vendor root)
- [x] Attribution: "Copyright (c) 2026 Leonxlnx" preserved in LICENSE
- [x] Source commit pinned: `e988add20dab0fa97d7a76781c48961c8184288e`
- [x] Text-only: 13 SKILL.md + 1 DESIGN.md, 0 binaries
- [x] No secrets/PII/private locators
- [x] `execution_status: reference-only-no-auto-execution`
- [x] Per-file sha256 in `source-lock.json` (see `critical_file_hashes` per skill)
- [x] Excluded: repo assets/*.webp, *.png, *.svg, examples/, scripts/, .github/,
      .claude-plugin/, research/laziness/**, CHANGELOG.md, README.md, skill.sh

## Homólogo routing

| vendor skill             | homólogo                          | family                                |
| ------------------------ | --------------------------------- | ------------------------------------- |
| taste-skill              | design-taste-frontend             | design-* (original plan)              |
| soft-skill               | design-high-end-visual-design     | design-* (original plan)              |
| minimalist-skill         | design-minimalist-ui              | design-* (original plan)              |
| redesign-skill           | design-redesign-existing-projects | design-* (original plan)              |
| brandkit                 | design-brandkit                   | design-* (expansion)                  |
| brutalist-skill          | design-industrial-brutalist-ui    | design-* (expansion)                  |
| gpt-tasteskill           | design-gpt-taste                  | design-* (expansion)                  |
| image-to-code-skill      | design-image-to-code              | design-* (expansion)                  |
| imagegen-frontend-mobile | design-imagegen-frontend-mobile   | design-* (expansion)                  |
| imagegen-frontend-web    | design-imagegen-frontend-web      | design-* (expansion)                  |
| output-skill             | dev-full-output-enforcement       | dev-* (dev-workflow, not design)      |
| stitch-skill             | design-stitch-design-taste        | design-* (expansion)                  |
| taste-skill-v1           | design-taste-frontend-v1          | design-* (expansion, backward-compat) |

12 → design-* family, 1 → dev-* family. All H-03 path (per-skill
runtime-boundary).

## Verdict

**PASS.** 13 skills, MIT, 16 text files vendored, 0 binaries, 0 secrets. Ready
for Fase 2B-2E + expansion homólogo derivation (H-03 path).
