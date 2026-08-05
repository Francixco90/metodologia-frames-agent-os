# vercel-agent-skills vendor audit — Fase 1D

> Audit date: 2026-08-04 · Auditor: lead · 1 skill, MIT · Per-file sha256 in
> [`source-lock.json`](./source-lock.json).

## Scope

1 skill vendored text-only into
`skills/vendor/vercel-agent-skills/web-design-guidelines/` as
**reference-only** input for the locally-authored `design-web-design-guidelines`
homólogo (Design-OS Fase 2C, H-03 path). 1 text file copied, 0 binaries excluded.
Source is **MIT licensed** (declared in repo README `## License MIT`; no LICENSE
file in skill folder — LICENSE file created at vendor root from README
declaration).

## Source resolution

| skill                   | source repo                | commit    | license | source path                     | files vendored |
| ----------------------- | -------------------------- | --------- | ------- | ------------------------------- | -------------- |
| `web-design-guidelines` | `vercel-labs/agent-skills` | `7c180d9` | MIT     | `skills/web-design-guidelines/` | 1 (SKILL.md)   |

- **web-design-guidelines** (UI review guidance): single SKILL.md (39 lines).
  Reviews UI code for Web Interface Guidelines compliance (accessibility, UX,
  design best practices). Prose-only guidance, no code/CLI/network surface.

## License

Source is **MIT** (declared in `vercel-labs/agent-skills` README `## License
MIT`). The `skills/web-design-guidelines/` folder contains only `SKILL.md` (no
LICENSE file). A MIT LICENSE file was created at the vendor root
(`skills/vendor/vercel-agent-skills/LICENSE`) from the README declaration, with
Vercel attribution. MIT permits redistribution and modification with attribution.
Homólogo (`design-web-design-guidelines`, Fase 2C) derives under
`LicenseRef-MetodologIA-Internal` with `derivation_mode:
clean-room-prose-from-permissive-reference` (MIT-compatible; attribution preserved
in LINEAGE.yml).

## Global audit findings

### 1. License — MIT (declared in README, no folder LICENSE)

- MIT per repo README `## License` section.
- No LICENSE file in `skills/web-design-guidelines/` folder — LICENSE file
  created at vendor root (`skills/vendor/vercel-agent-skills/LICENSE`) from
  README declaration (standard MIT text + Vercel attribution).
- No source-available / NOT-OSI risk. License addendum: note MIT declared in
  README rather than a LICENSE file in the skill folder.

### 2. Binaries excluded

None. `skills/web-design-guidelines/` contains only `SKILL.md` (UTF-8 text, 39
lines). `file` reports no binary/executable/image/font. The vercel-labs/agent-skills
repo root contains 9 skill folders (composition-patterns, deploy-to-vercel,
react-best-practices, react-native-skills, react-view-transitions,
vercel-cli-with-tokens, vercel-optimize, web-design-guidelines,
writing-guidelines) + 5 `.zip` archives — **only `web-design-guidelines/`
vendored**. `.zip` archives and other skills excluded.

### 3. Secrets / PII / private locators

None. SKILL.md references no credentials, tokens, internal hostnames, or PII.
Pure prose UI-review guidance.

### 4. Network / execution surface

None. web-design-guidelines is prose-only UI-review guidance. No `npx`, no CLI,
no network fetch, no install. Vendored as **reference-only** — not executed, not
registered, not wired into any validator. Homólogo
`design-web-design-guidelines` (Fase 2C) reproduces the review guidance as
clean-room prose, fail-closed.

### 5. Content-type verification

SKILL.md is UTF-8 text (ASCII subset). 0 binary leaks.

## Per-skill checklist

### web-design-guidelines

- [x] License: MIT (declared in README; LICENSE file created at vendor root)
- [x] Attribution: "Copyright (c) 2026 Vercel, Inc." in created LICENSE
- [x] Source commit pinned: `7c180d9044c9ae2b442b567aad4e42a28dd5ed62`
- [x] Text-only: 1 file (SKILL.md), 0 binaries
- [x] No secrets/PII/private locators
- [x] `execution_status: reference-only-no-auto-execution`
- [x] Per-file sha256 in `source-lock.json`:
      `SKILL.md = f4647ca866a3accf763777f83e7682954f0187cd6bea7eea0399796652414e8f`
- [x] Excluded: 8 other vercel-labs/agent-skills folders + 5 .zip archives

## Verdict

**PASS.** 1 skill, MIT (README-declared), 2 text files vendored (SKILL.md +
created LICENSE), 0 binaries, 0 secrets. Ready for Fase 2C
`design-web-design-guidelines` homólogo derivation (H-03 path, per-skill
runtime-boundary).
