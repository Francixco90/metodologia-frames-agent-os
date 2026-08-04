# Frames ContentOS Fase 1B — verification report

> Date: 2026-08-04 · Branch: `feat/content-os-vendor-remotion-publisher` · Base:
> `0428e0b` (post-Fase 1D). Source: `remotion-dev/skills` @
> `f94c1e18db2bb30b904784b986f6897822b8f152`.

## Objective

Vendor 11 Remotion publisher skills (source-available, Remotion AG two-tier, NOT OSI)
as text-only, reference-only input for Frames ContentOS Fase 2B homólogos. No execution, no
registration, no runtime dependency added.

## What was done

1. Researched the source via an Explore agent. The 11 skills live in the standalone
   `remotion-dev/skills` repo (the `npx skills add` target). The main-repo mirror
   (`remotion-dev/remotion` → `packages/skills/`) has a 12th skill (`remotion-studio`)
   not vendored here. The standalone repo ships **no LICENSE file**; the skills are
   governed by the main-repo `LICENSE.md` (Remotion two-tier, source-available).
2. Cloned `remotion-dev/skills` at `f94c1e18` into `/tmp/remotion-skills/`.
3. Audited file types: 265 source files — 159 md, 23 yaml, 16 json, 4 geojson, 40
   code (.tsx/.ts/.mjs, all in `remotion-maps` techniques + nested duplicates), 23 PNG
   icons (binary, excluded).
4. Copied text-only (`.md`, `.json`, `.mjs`, `.js`, `.cjs`, `.ts`, `.tsx`, `.css`,
   `.html`, `.py`, `.sh`, `.yaml`, `.yml`, `.svg`, `.txt`, `.geojson`) to
   `skills/vendor/remotion-publisher/<skill>/`. Excluded 23 PNG icons, `node_modules/`,
   `.git/`. Copied `README.md` to vendor root.
5. Fetched `remotion-dev/remotion` main `LICENSE.md` to
   `docs/remotion-publisher/LICENSE-upstream.md` (sha256
   `bd65083b940f61904f6ef298aade918a7cad72a3e35bc406e36fab365844b673` — matches the
   existing `H03-LIC-REMOTION-001.yml` `official_license_sha256`).
6. Generated `docs/remotion-publisher/source-lock.json` — 11 vendor entries, per-file
   sha256 (242 files), source-available attribution, known risks, update procedure.
7. Wrote `docs/remotion-publisher/audit-report.md` (per-skill checklist + global findings
   - license risk) and `docs/remotion-publisher/architecture.md` (mapping + clean-room
     derivation contract).
8. Extended `receipts/dependency-audits/H03-LIC-REMOTION-001.yml` with a
   `source-available-publisher` addendum (append-only).
9. Content-type verified: all 242 files ASCII/UTF-8/HTML/JSON/geojson (0 binary leaks).

## Inventory

- 11 skill dirs under `skills/vendor/remotion-publisher/` + `README.md`.
- 242 text files copied; 23 PNG icons excluded; 0 binary leaks.
- `docs/remotion-publisher/`: `source-lock.json`, `audit-report.md`, `architecture.md`,
  `verification-report.md` (this file), `LICENSE-upstream.md`.

### Files per skill

remotion-best-practices (122), remotion-captions (5), remotion-create (4),
remotion-docs (2), remotion-interactivity (2), remotion-maps (31), remotion-markup (61),
remotion-multimedia (5), remotion-render (3), remotion-saas (5), remotion-upgrade (2).

## Hash integrity

- All 242 file sha256 recorded in `source-lock.json` under each vendor's
  `critical_file_hashes`. Regeneration deterministic from the vendor copy.
- `LICENSE-upstream.md` sha256 matches `H03-LIC-REMOTION-001.yml` record. ✅

## License guard

- Vendored skills are **source-available** (Remotion AG two-tier, NOT OSI). No
  redistribution/relicensing rights.
- `commercial_or_production_use = coverage_gap` (entity-size/use-case not adjudicated).
- Extended `H03-LIC-REMOTION-001.yml` (append-only addendum) documenting the
  source-available publisher skills as reference-only vendor material.
- Fase 2B homólogos must be **clean-room prose** (`LicenseRef-MetodologIA-Internal`,
  `derivation_mode: clean-room-prose-from-source-available-reference`), no vendor code
  copied, self-contained `check-skill.mjs`.

## Gates (CI subset)

`pnpm check:repo`, `verify:contributions`, `verify:skills`, `verify:content-os`,
`verify:ai-runtime`, `typecheck`, `lint`, `test` (541), `format:check`. `verify:creation-doc`
pre-existing failure out of scope (not in CI subset). Vendors bypass `verify:skills`
(not in registries); `skills/vendor/**` excluded in tsconfig, eslint, prettier,
check-privacy.

## What was NOT done (correctly)

- No `skill-registry.yml` / `creation-v3-skill-registry.yml` entry (vendors bypass
  `verify:skills`).
- No `package.json` mutation (no runtime dep; Remotion 4.0.494 already toolchain-pinned;
  `RCP-DEP-PRODUCTION` receipt unchanged).
- No vendor file executed, type-checked, linted, formatted or privacy-scanned by the
  first-party pipeline.
- No `content-os-remotion-*` native skill created (Fase 2B homólogos, separate PRs).
- No LICENSE file copied into `skills/vendor/remotion-publisher/` root (the standalone
  repo has none; the governing license lives at `docs/remotion-publisher/LICENSE-upstream.md`).

## Risks carried forward

- **Source-available license** (most severe). Fase 2B homólogos clean-room prose; extend
  `H03-LIC-REMOTION-001.yml` (done in this PR); stop-rule
  `license_unresolved_for_copied_material` if violated.
- `remotion-maps` `.tsx/.ts/.mjs` code (maptiler/cesium) imports Remotion runtime — text
  reference only, excluded from tsconfig/eslint. Fase 2B `content-os-remotion-maps`
  homólogo adapts geo-map patterns locally (no vendor code copy).
- `remotion-best-practices` umbrella nests duplicate copies of all other skills —
  reference duplication, no runtime impact.

## Next gate

Fase 1B commit + PR upstream to `Francixco90/metodologia-frames-agent-os`. Self-authored
PR merge requires explicit user confirmation. Fase 2B homólogos (4 PRs batched 3) align
after Fase 1B lands.
