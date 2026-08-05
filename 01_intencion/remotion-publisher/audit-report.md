# Remotion publisher vendor audit — Fase 1B

> Audit date: 2026-08-04 · Auditor: lead · Source: `remotion-dev/skills` @
> `f94c1e18db2bb30b904784b986f6897822b8f152` · License: source-available
> (Remotion AG two-tier, NOT OSI)

## Scope

11 Remotion publisher skills vendored text-only into
`skills/vendor/remotion-publisher/` as **reference-only** input for the
locally-authored `content-os-remotion-*` homólogos (Frames ContentOS Fase 2B). 242 text
files copied, 23 PNG icons excluded. Per-file sha256 recorded in
[`source-lock.json`](./source-lock.json).

## Source resolution

- **Canonical repo**: `https://github.com/remotion-dev/skills` (standalone, the
  `npx skills add` install target). 11 skills at HEAD `f94c1e18`.
- **Mirror**: `remotion-dev/remotion` → `packages/skills/` (source of truth, kept in
  sync via `scripts/sync-readme.ts`). The mirror has a **12th skill** (`remotion-studio`)
  absent from the standalone repo — **not vendored here** (the standalone set matches
  the user's "11 skills" request).
- **No LICENSE file in the standalone repo** (root: `README.md`, `package.json`,
  `tsconfig.json`, `scripts/`, `skills/`). `package.json` declares `private: true` with
  no `license` field. GitHub API reports `license: None`. The skills are governed by the
  main-repo `LICENSE.md` (Remotion two-tier), fetched to
  `docs/remotion-publisher/LICENSE-upstream.md` (sha256
  `bd65083b940f61904f6ef298aade918a7cad72a3e35bc406e36fab365844b673` — matches the
  existing `H03-LIC-REMOTION-001.yml` `official_license_sha256`).

## Global audit findings

### 1. License — source-available, NOT OSI (LICENSE RISK)

- Remotion is **source-available**, not open-source. Two-tier "Free License / Company
  License" (Copyright © 2026 Remotion):
  - **Free License**: individuals, for-profits with ≤3 employees, non-profits,
    evaluators.
  - **Company License** (paid): required for larger for-profits.
- GitHub classifies the main repo as `NOASSERTION` / "Other".
- **No rights to redistribute or relicense.** Vendored copies are reference-only; the
  MetodologIA homólogos (`content-os-remotion-*`) must be **clean-room prose** — no
  vendor code copied. The vendor copy is auditable reference, not a derivative work
  shipped to users.
- `commercial_or_production_use = coverage_gap` (entity-size / use-case eligibility not
  adjudicated). See `receipts/dependency-audits/H03-LIC-REMOTION-001.yml` addendum
  (extended in this PR).

### 2. Binaries excluded

23 PNG icon files (`assets/remotion-icon.png` per skill + nested duplicates) excluded.
No other binaries. Extensions copied: `.md`, `.json`, `.mjs`, `.js`, `.cjs`, `.ts`,
`.tsx`, `.css`, `.html`, `.py`, `.sh`, `.yaml`, `.yml`, `.svg`, `.txt`, `.geojson`.

### 3. Secrets / PII / private locators

- `skills/vendor/**` skipped by `check-privacy.ts` (vendors audited here, not by the
  first-party scanner — mirrors prettier/tsconfig/eslint exclusions).
- Manual scan: no real secrets, API keys, or private locators present (regex-verified
  `sk-…`, `ghp_…`, `AIza…`, PEM blocks; `/Users/…` / `/home/…` paths).

### 4. Network / telemetry / auto-execution

- Vendored files are **not executed**: `skills/vendor/**` excluded in `tsconfig`
  (no type-check), `eslint` (no lint), `vitest` (test include is `tests/**` only),
  `prettier` (no reformat).
- Code files (`.ts`, `.tsx`, `.mjs` — 40 files, all in `remotion-maps` techniques +
  nested duplicates) import the Remotion runtime. They are vendored as **text
  reference only** and are NOT executed, type-checked, or linted by the first-party
  pipeline.
- No telemetry/beacon endpoints in the reference markdown.

### 5. Integrity

- `source-lock.json` records sha256 for every vendored file (242 files).
- `execution_status: reference-only-no-auto-execution` for all 11 vendors.

## Per-skill checklist

Legend: ✅ pass · ⚠ noted risk (does not block vendor) · — n/a.

| skill                   | files | license         | binaries excluded | no secrets | no auto-exec | risk                                                                   |
| ----------------------- | ----- | --------------- | ----------------- | ---------- | ------------ | ---------------------------------------------------------------------- |
| remotion-best-practices | 122   | ⚠ source-avail. | ✅                | ✅         | ✅           | ⚠ umbrella; nested duplicate skill copies; .tsx reference inert        |
| remotion-captions       | 5     | ⚠ source-avail. | ✅                | ✅         | ✅           | ⚠ thin reference                                                       |
| remotion-create         | 4     | ⚠ source-avail. | ✅                | ✅         | ✅           | ⚠ thin reference (scaffold)                                            |
| remotion-docs           | 2     | ⚠ source-avail. | ✅                | ✅         | ✅           | ⚠ thin reference                                                       |
| remotion-interactivity  | 2     | ⚠ source-avail. | ✅                | ✅         | ✅           | ⚠ thin reference                                                       |
| remotion-maps           | 31    | ⚠ source-avail. | ✅                | ✅         | ✅           | ⚠ .tsx/.ts/.mjs code (maptiler/cesium) imports remotion runtime; inert |
| remotion-markup         | 61    | ⚠ source-avail. | ✅                | ✅         | ✅           | ⚠ nested remotion-maps duplicate; .tsx reference inert                 |
| remotion-multimedia     | 5     | ⚠ source-avail. | ✅                | ✅         | ✅           | ⚠ thin reference                                                       |
| remotion-render         | 3     | ⚠ source-avail. | ✅                | ✅         | ✅           | ⚠ thin reference                                                       |
| remotion-saas           | 5     | ⚠ source-avail. | ✅                | ✅         | ✅           | ⚠ thin reference                                                       |
| remotion-upgrade        | 2     | ⚠ source-avail. | ✅                | ✅         | ✅           | ⚠ thin reference                                                       |

## Verdict

**APPROVED for vendor (reference-only).** All 11 skills pass the text-only, no-secret,
no-auto-execution checks. The **source-available license risk** is documented in
`source-lock.json` per-vendor `known_risks`, reflected in the extended
`H03-LIC-REMOTION-001.yml` addendum, and addressed by the Fase 2B adaptation contract:
homólogos are **clean-room prose** (`LicenseRef-MetodologIA-Internal`,
`derivation_mode: clean-room-prose-from-source-available-reference`), no vendor code
copied, `check-skill.mjs` self-contained (no import of vendor code), no new runtime dep
(Remotion 4.0.494 already in toolchain).

## Update procedure

1. Clone `remotion-dev/skills` at the new commit.
2. Re-copy text-only (`skills/<name>/` → `skills/vendor/remotion-publisher/<name>/`).
3. Re-audit per this checklist; update `known_risks` if new network/auth patterns.
4. Regenerate `source-lock.json` (commit + hashes).
5. Run `pnpm check:repo && pnpm verify:skills && pnpm typecheck && pnpm lint && pnpm test && pnpm format:check`.
