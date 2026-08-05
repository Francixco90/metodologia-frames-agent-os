# find-skills vendor audit — Fase 1A

> Audit date: 2026-08-04 · Auditor: lead · 1 skill, MIT · Per-file sha256 in
> [`source-lock.json`](./source-lock.json).

## Scope

1 skill vendored text-only into `skills/vendor/vercel-skills/find-skills/` as
**reference-only** input for the locally-authored `metodologia-find-skills`
homólogo (Design-OS Fase 2A, v2 path + shared receipt cascade). 1 text file
copied, 0 binaries excluded. Source is **MIT licensed** (verified).

## Source resolution

| skill         | source repo          | commit    | license | source path           | files vendored |
| ------------- | -------------------- | --------- | ------- | --------------------- | -------------- |
| `find-skills` | `vercel-labs/skills` | `ab4fc49` | MIT     | `skills/find-skills/` | 1 (SKILL.md)   |

- **find-skills** (meta-discovery): single-file SKILL.md (141 lines, 5.4 KB).
  Helps users discover and install agent skills from the open agent skills
  ecosystem (skills.sh) via the `npx skills` CLI (`find`/`add`/`update`).
  Includes a capability-category table, search tips, and quality-verification
  guidance (install count, source reputation, GitHub stars) before recommending.

## License

Source is **MIT** (Copyright (c) 2026 Vercel, Inc.). Verified via LICENSE file
at repo root (`MIT License` header + Vercel copyright). MIT permits
redistribution and modification with attribution. Vendored copy retains the
MIT LICENSE file at the vendor root (`skills/vendor/vercel-skills/LICENSE`).
Homólogo (`metodologia-find-skills`, Fase 2A) derives under
`LicenseRef-MetodologIA-Internal` with `derivation_mode:
clean-room-prose-from-permissive-reference` (MIT-compatible; attribution
preserved in LINEAGE.yml).

## Global audit findings

### 1. License — MIT (verified)

- MIT per repo: `vercel-labs/skills` LICENSE file content (`MIT License`,
  `Copyright (c) 2026 Vercel, Inc.`).
- LICENSE file copied to vendor root (`skills/vendor/vercel-skills/LICENSE`).
- No source-available / NOT-OSI risk. No license addendum required.

### 2. Binaries excluded

None. `skills/find-skills/` contains only `SKILL.md` (UTF-8 text, 141 lines).
`file` reports no binary/executable/image/font. The source repo root contains
`src/`, `bin/`, `tests/`, `package.json`, `pnpm-lock.yaml`, `scripts/` (the
`skills` CLI package itself) — **NOT vendored**. Only `skills/find-skills/SKILL.md`
copied.

### 3. Secrets / PII / private locators

None. SKILL.md references public URLs only (`https://skills.sh/`,
`https://github.com/...`, `npx skills` CLI commands). No credentials, tokens,
internal hostnames, or PII.

### 4. Network / execution surface

find-skills recommends running `npx skills find` / `npx skills add` (external
CLI, network fetch to skills.sh registry). Vendored as **reference-only** —
not executed, not registered, not wired into any validator. Homólogo
`metodologia-find-skills` (Fase 2A) must describe the discovery capability in
prose and gate any install/execute behind explicit user confirmation
(fail-closed, matching MetodologIA `RENDERED_DRAFT != ... != PUBLISHED` and
"no activar conectores ni publicar" rules).

### 5. Content-type verification

SKILL.md is UTF-8 text (ASCII subset). 0 binary leaks.

## Per-skill checklist

### find-skills

- [x] License: MIT (verified, LICENSE copied to vendor root)
- [x] Attribution: "Copyright (c) 2026 Vercel, Inc." preserved in LICENSE
- [x] Source commit pinned: `ab4fc49265c443279a5deae20297e631470da68c`
- [x] Text-only: 1 file (SKILL.md), 0 binaries
- [x] No secrets/PII/private locators
- [x] `execution_status: reference-only-no-auto-execution`
- [x] Per-file sha256 in `source-lock.json`:
      `SKILL.md = c00eeea0e13e74fe4a9d84ba0a8542205a1b736d65f13134fe1a6647eb14976f`
- [x] Excluded: repo root `src/`, `bin/`, `tests/`, `scripts/`, `package.json`,
      `pnpm-lock.yaml`, `.github/`, `.husky/`, `AGENTS.md`, `README.md`,
      `ThirdPartyNoticeText.txt`, `build.config.mjs` (the `skills` CLI package;
      not part of the skill itself)

## Verdict

**PASS.** 1 skill, MIT, 1 text file vendored, 0 binaries, 0 secrets. Ready for
Fase 2A `metodologia-find-skills` homólogo derivation (v2 path + shared receipt
cascade).
