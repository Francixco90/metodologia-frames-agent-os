# ui-ux-pro-max vendor audit — Fase 1C

> Audit date: 2026-08-04 · Auditor: lead · 1 skill (generator-based, 7
> sub-skills bundled), MIT · Per-file sha256 in
> [`source-lock.json`](./source-lock.json).

## Scope

1 generator-based skill vendored text-only into
`skills/vendor/ui-ux-pro-max/ui-ux-pro-max/` as **reference-only** input for
the locally-authored `design-ui-ux-pro-max` homólogo (Design-OS Fase 2B,
H-03 path). 361 text files copied into the skill dir + 1 LICENSE at vendor
root = 362 total. Binaries excluded (PNG screenshot, TrueType fonts).
Source is **MIT licensed** (verified).

## Source resolution

| skill           | source repo                            | commit    | license | source path     | files vendored |
| --------------- | -------------------------------------- | --------- | ------- | --------------- | -------------- |
| `ui-ux-pro-max` | `nextlevelbuilder/ui-ux-pro-max-skill` | `4d140cf` | MIT     | `/` (full repo) | 361 + LICENSE  |

- **ui-ux-pro-max** (design-intelligence engine): manifest `skill.json`
  (v2.11.0) — "AI-powered design intelligence with 84 UI styles, 192 color
  palettes, 74 font pairings, 98 UX guidelines, and 25 chart types across 22
  tech stacks". Bundles 7 install-target skills under `.claude/skills/`:
  `ui-ux-pro-max` (umbrella, 196-line SKILL.md + references/ + scripts/ +
  data/ CSVs), `design`, `design-system`, `ui-styling`, `brand`,
  `banner-design`, `slides`. Generator CLI under `cli/` (189 files: source,
  assets/skills/ canonical SKILL.md, assets/data/ CSV intelligence).
  npm-package source under `src/` (57 data CSVs). `stack/` =
  `claude-website-design-stack` reference composition (24 files: docs,
  scripts, .mcp.json, package.json with Playwright devDep declared but not
  installed).

## License

Source is **MIT** (Copyright (c) 2024 Next Level Builder). Verified via
LICENSE file at repo root (`MIT License` header + Next Level Builder
copyright). MIT permits redistribution and modification with attribution.
Vendored copy retains the MIT LICENSE file at the vendor root
(`skills/vendor/ui-ux-pro-max/LICENSE`). Homólogo (`design-ui-ux-pro-max`,
Fase 2B) derives under `LicenseRef-MetodologIA-Internal` with
`derivation_mode: clean-room-prose-from-permissive-reference`
(MIT-compatible; attribution preserved in LINEAGE.yml).

## Global audit findings

### 1. License — MIT (verified)

- MIT per repo: `nextlevelbuilder/ui-ux-pro-max-skill` LICENSE file content
  (`MIT License`, `Copyright (c) 2024 Next Level Builder`).
- LICENSE file copied to vendor root
  (`skills/vendor/ui-ux-pro-max/LICENSE`).
- No source-available / NOT-OSI risk. No license addendum required.

### 2. Binaries excluded

- `screenshots/website.png` (PNG image, 2048×1153) — excluded (binary).
- `.claude/skills/ui-styling/canvas-fonts/*.ttf` (TrueType fonts) — excluded
  (binary). OFL `.txt` license files for the fonts retained (text).
- `gallery/` (200K Next.js demo app), `projects/` (80K templates), `preview/`
  (16K) — excluded (demo/template, not reference doctrine).
- `scripts/` root (16K build scripts), `.github/` (28K CI/governance) —
  excluded (build/CI, not skill content).
- `node_modules/`, `dist/`, `.git/`, `package-lock.json` — excluded.
- `file` scan of vendored tree reports 0 binary/image/font/compressed.

### 3. Secrets / PII / private locators

None. SKILL.md + CSVs + scripts reference public URLs only
(`https://uupm.cc`, `https://github.com/nextlevelbuilder/...`, `npx
ui-ux-pro-max-cli` CLI commands, public stack docs). No credentials, tokens,
internal hostnames, or PII.

### 4. Network / execution surface

ui-ux-pro-max ships a generator CLI (`cli/`, invoked via `npx
ui-ux-pro-max-cli init --ai {{platform}}`) and a Python search script
(`.claude/skills/ui-ux-pro-max/scripts/search.py`, Python 3.x, no external
deps). Vendored as **reference-only** — not executed, not registered, not
wired into any validator, no `node_modules`/`dist` vendored. `stack/`
declares a Playwright `devDependency` in `package.json` but it is not
installed (text reference only). Homólogo `design-ui-ux-pro-max` (Fase 2B)
must describe the design-system generation capability in prose and gate any
CLI/script execution behind explicit user confirmation (fail-closed,
matching MetodologIA `RENDERED_DRAFT != ... != PUBLISHED` and "no activar
conectores ni publicar" rules). `check-skill.mjs` must be self-contained
(no import of vendor code).

### 5. Content-type verification

All 361 vendored files are UTF-8 text (`.md`, `.json`, `.csv`, `.py`,
`.mjs`, `.js`, `.ts`, `.sh`, `.txt`, `.html`, `.css`, `.yaml`, `.yml`).
`file` scan reports 0 binary leaks.

## Per-skill checklist

### ui-ux-pro-max

- [x] License: MIT (verified, LICENSE copied to vendor root)
- [x] Attribution: "Copyright (c) 2024 Next Level Builder" preserved in LICENSE
- [x] Source commit pinned: `4d140cf`
- [x] Text-only: 361 files in skill dir, 0 binaries (PNG + .ttf excluded)
- [x] No secrets/PII/private locators
- [x] `execution_status: reference-only-no-auto-execution`
- [x] Per-file sha256 in `source-lock.json`; 8 critical_file_hashes
      (skill.json + 7 SKILL.md)
- [x] Excluded: `gallery/`, `projects/`, `preview/`, `screenshots/`,
      `scripts/` (root build), `.github/`, `node_modules/`, `dist/`, `.git/`,
      `*.ttf`, `package-lock.json`, governance docs (`CLAUDE.md`,
      `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md`,
      `README.zh.md`), `.claude-plugin/`, `.releaserc.json`
- [x] Vendored: `skill.json`, `README.md`, `LICENSE` (root), `.claude/skills/`
      (7 skills, .ttf excluded), `cli/` (189 files), `src/` (57 CSVs),
      `stack/` (24 files), `docs/` (1 dev md)

## Verdict

**PASS.** 1 generator-based skill, MIT, 361 text files + LICENSE vendored, 0
binaries, 0 secrets. Ready for Fase 2B `design-ui-ux-pro-max` homólogo
derivation (H-03 path, per-skill runtime-boundary receipt).
