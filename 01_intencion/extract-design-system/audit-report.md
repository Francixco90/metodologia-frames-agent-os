# extract-design-system vendor audit — Fase 1F (extract)

> Audit date: 2026-08-04 · Auditor: lead · 1 generator-based skill (CLI + MCP),
> MIT · Per-file sha256 in [`source-lock.json`](./source-lock.json).

## Scope

1 generator-based skill vendored text-only into
`skills/vendor/extract-design-system/extract-design-system/` as
**reference-only** input for the locally-authored `design-extract-design-system`
homólogo (Design-OS Fase 2D, H-03 path). 30 text files in skill dir + 1 LICENSE
at vendor root = 31 total. 0 binaries. Source is **MIT licensed** (verified).

## Source resolution

| skill                   | source repo                      | commit    | license | source path  | files vendored |
| ----------------------- | -------------------------------- | --------- | ------- | ------------ | -------------- |
| `extract-design-system` | `arvindrk/extract-design-system` | `1873741` | MIT     | `/` (scoped) | 30 + LICENSE   |

- **extract-design-system** (design-token extractor): CLI v0.1.11
  (`bin: extract-design-system` + `extract-design-system-mcp`). Extracts design
  primitives (colors, typography, spacing, border radius, shadows) from a
  public website via Playwright → `.extract-design-system/normalized.json`
  - CSS custom properties. Skill SKILL.md defines workflow: confirm URL →
    `npx extract-design-system <url>` → review normalized.json → optional
    starter files. CLI source in `src/` (cli.ts, mcp.ts, commands/, adapters/,
    scanners/, normalize/, schemas/, utils/, formatters/). Skill in
    `skills/extract-design-system/` (SKILL.md + references/outputs.md +
    references/workflow.md).

## License

Source is **MIT** (Copyright (c) 2026 Arvind). Verified via LICENSE file at
repo root. MIT permits redistribution and modification with attribution.
Vendored copy retains LICENSE at vendor root
(`skills/vendor/extract-design-system/LICENSE`). Homólogo
(`design-extract-design-system`, Fase 2D) derives under
`LicenseRef-MetodologIA-Internal` with `derivation_mode:
clean-room-prose-from-permissive-reference` (MIT-compatible).

## Global audit findings

### 1. License — MIT (verified)

- MIT per `arvindrk/extract-design-system` LICENSE (`MIT License`,
  `Copyright (c) 2026 Arvind`).
- LICENSE copied to vendor root. No source-available/NOT-OSI risk.

### 2. Binaries excluded

None. 31 files all UTF-8 text (`.md`, `.ts`, `.json`). `file` reports 0 binary.
Excluded: `node_modules/`, `dist/`, `package-lock.json`, `tests/` (dev),
`.github/`, `.codex-plugin/`, `.cursor/` (plugin/MCP config), governance docs
(`CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md`), `.gitignore`.

### 3. Secrets / PII / private locators

None. SKILL.md + src/ reference public URLs only (target website URL provided
by user at runtime, `npx playwright install chromium`, `npx
extract-design-system`). No credentials, tokens, internal hostnames, PII.

### 4. Network / execution surface

extract-design-system ships a CLI (`src/cli.ts`, bin `extract-design-system`)

- MCP server (`src/mcp.ts`). CLI uses Playwright (headless chromium) to fetch
  a public website. Vendored as **reference-only** — not executed, not
  registered, not wired into any validator, no `node_modules`/`dist` vendored.
  Homólogo `design-extract-design-system` (Fase 2D) must describe the
  token-extraction capability in prose and gate any CLI/MCP execution behind
  explicit user confirmation (fail-closed, per "no activar conectores ni
  publicar" + `RENDERED_DRAFT != ... != PUBLISHED`). `check-skill.mjs`
  self-contained (no import of vendor CLI/src).

### 5. Content-type verification

31 files UTF-8 text. 0 binary leaks.

## Per-skill checklist

### extract-design-system

- [x] License: MIT (verified, LICENSE copied to vendor root)
- [x] Attribution: "Copyright (c) 2026 Arvind" preserved in LICENSE
- [x] Source commit pinned: `1873741`
- [x] Text-only: 30 files in skill dir + LICENSE, 0 binaries
- [x] No secrets/PII/private locators
- [x] `execution_status: reference-only-no-auto-execution`
- [x] Per-file sha256 in `source-lock.json`; 3 critical_file_hashes
      (SKILL.md, package.json, src/cli.ts)
- [x] Excluded: `node_modules/`, `dist/`, `tests/`, `.github/`,
      `package-lock.json`, `.codex-plugin/`, `.cursor/`, `CODE_OF_CONDUCT.md`,
      `CONTRIBUTING.md`, `SECURITY.md`, `.gitignore`, `.git/`
- [x] Vendored: `skills/`, `src/`, `scripts/`, `README.md`, `package.json`,
      `tsconfig.json`, `tsconfig.build.json`, `skills-lock.json`,
      `vitest.config.ts`

## Verdict

**PASS.** 1 generator-based skill, MIT, 31 text files vendored, 0 binaries, 0
secrets. Ready for Fase 2D `design-extract-design-system` homólogo derivation
(H-03 path, per-skill runtime-boundary receipt, code `EDS`).
