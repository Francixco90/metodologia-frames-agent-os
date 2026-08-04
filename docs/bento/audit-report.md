# Bento vendor audit — Fase 1C

> Audit date: 2026-08-04 · Auditor: lead · 3 skills, all MIT · Per-file sha256
> in [`source-lock.json`](./source-lock.json).

## Scope

3 Bento skills vendored text-only into `skills/vendor/bento/` as
**reference-only** input for the locally-authored `content-os-bento-*`
homólogos (Content OS Fase 2C). 24 text files copied, 14 image/metadata
binaries excluded. All 3 sources are **MIT licensed** (verified per repo).

## Source resolution

| skill              | source repo                      | commit     | license | source path                                 | files vendored                               |
| ------------------ | -------------------------------- | ---------- | ------- | ------------------------------------------- | -------------------------------------------- |
| `bento`            | `bergside/awesome-design-skills` | `f631a09b` | MIT     | `skills/bento/`                             | 3 (SKILL.md + DESIGN.md + LICENSE)           |
| `bento-slides`     | `nyblnet/bento`                  | `cc038183` | MIT     | `plugins/bento-slides/skills/bento-slides/` | 3 (SKILL.md + LICENSE + THIRD_PARTY_NOTICES) |
| `apple-bento-grid` | `hubeiqiao/apple-bento-grid`     | `235f740b` | MIT     | root (`SKILL.md` at repo root)              | 18                                           |

- **bento** (principal): grid-layout skill from bergside/awesome-design-skills.
  2 content files (SKILL.md + DESIGN.md) + LICENSE.
- **bento-slides**: single-file SKILL.md from nyblnet/bento (full app repo;
  only the `plugins/bento-slides/skills/bento-slides/SKILL.md` vendored).
  References `bento.page` app (network fetch for latest deck runtime).
- **apple-bento-grid**: Apple-inspired bento grid presentation card generator
  (hubeiqiao). 18 text files: SKILL.md, design-system.md, evals/evals.json,
  examples/*.html (6 HTML reference layouts), scripts/{package.json,
  package-lock.json,screenshot.mjs}, social/{launch-copy.md,og-preview.html},
  .claude-plugin/{marketplace.json,plugin.json}, README.md, LICENSE.

## License

All 3 sources are **MIT** (verified via GitHub API `license: MIT` for each
repo + LICENSE file content). MIT permits redistribution and modification
with attribution. Vendored copies retain the MIT LICENSE file per skill.
Homólogos (`content-os-bento-*`, Fase 2C) derive under
`LicenseRef-MetodologIA-Internal` with `derivation_mode: locally-authored-adaptation`
(MIT-compatible; attribution preserved in LINEAGE.yml).

## Global audit findings

### 1. License — MIT (all 3, verified)

- MIT per repo: `bergside/awesome-design-skills`, `nyblnet/bento`,
  `hubeiqiao/apple-bento-grid` all report `license: MIT` via GitHub API.
- LICENSE file copied to each vendor skill dir.
- `bento-slides` includes `THIRD_PARTY_NOTICES.md` (nyblnet attribution).
- No source-available / NOT-OSI risk. No license addendum required (unlike
  Fase 1B Remotion).

### 2. Binaries excluded

apple-bento-grid: 14 files excluded — 12 image assets
(`.jpg`/`.png`/`.webp` in `examples/` and `social/`) + `.gitignore`
(non-content). LICENSE re-added as text. No other binaries across the 3
skills.

### 3. Secrets / PII / private locators

- `skills/vendor/**` skipped by `check-privacy.ts` (vendors audited here, not
  by the first-party scanner — mirrors prettier/tsconfig/eslint exclusions).
- Manual scan: no real secrets, API keys, or private locators present
  (regex-verified `sk-…`, `ghp_…`, `AIza…`, PEM blocks; `/Users/…` paths).

### 4. Network / telemetry / auto-execution

- Vendored files are **not executed**: `skills/vendor/**` excluded in
  `tsconfig` (no type-check), `eslint` (no lint), `vitest` (test include is
  `tests/**` only), `prettier` (no reformat).
- `apple-bento-grid/scripts/screenshot.mjs` + `scripts/package.json` reference
  Playwright (screenshot export). Vendored as text reference; NOT executed.
- `bento-slides` references `bento.page` (network fetch for latest deck
  runtime). Reference guidance; not auto-fetched.

### 5. Integrity

- `source-lock.json` records sha256 for every vendored file (24 files).
- `execution_status: reference-only-no-auto-execution` for all 3 vendors.

## Per-skill checklist

Legend: ✅ pass · ⚠ noted risk (does not block vendor) · — n/a.

| skill            | files | license | binaries excluded | no secrets | no auto-exec | risk                                                    |
| ---------------- | ----- | ------- | ----------------- | ---------- | ------------ | ------------------------------------------------------- |
| bento            | 3     | ✅ MIT  | —                 | ✅         | ✅           | ⚠ thin (2 content files)                                |
| bento-slides     | 3     | ✅ MIT  | —                 | ✅         | ✅           | ⚠ single SKILL.md; references bento.page network        |
| apple-bento-grid | 18    | ✅ MIT  | ✅ (12 images)    | ✅         | ✅           | ⚠ scripts reference Playwright; .claude-plugin metadata |

## Verdict

**APPROVED for vendor (reference-only).** All 3 skills pass the text-only,
no-secret, no-auto-execution checks. All MIT — no license risk (unlike
Fase 1B Remotion source-available). Homólogos (`content-os-bento-*`, Fase 2C)
derive under `LicenseRef-MetodologIA-Internal` with MIT attribution
preserved in LINEAGE.yml.

## Update procedure

1. Clone each source repo at the new commit.
2. Re-copy text-only to `skills/vendor/bento/<skill>/`.
3. Re-audit per this checklist; update `known_risks` if new network/auth.
4. Regenerate `source-lock.json` (commit + hashes).
5. Run `pnpm check:repo && pnpm verify:skills && pnpm typecheck && pnpm lint && pnpm test && pnpm format:check`.
