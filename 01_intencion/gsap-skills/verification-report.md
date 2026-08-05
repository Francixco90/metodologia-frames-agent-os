# Design-OS Fase 1G — verification report

> Date: 2026-08-04 · Branch: `feat/vendor-gsap-skills` · Base: `b55a14d`
> (post-PR #50). 1 source, MIT. NEW (user request: "agregar emil, gsap").

## Objective

Vendor 1 gsap-skills motion-library skill (MIT) as text-only, reference-only
input for `design-gsap-motion` homólogo (H-03 path, code `GSM`). No execution,
no registration, no runtime dependency.

## What was done

1. Verified source + license: `greensock/gsap-skills` (MIT, Copyright (c)
   2026 GreenSock) via LICENSE at repo root.
2. Cloned @ `aed9cfd`.
3. Audited structure: 8 sub-skills (gsap-core 254, gsap-timeline 107,
   gsap-scrolltrigger 296, gsap-plugins 433, gsap-utils 284, gsap-react 135,
   gsap-performance 79, gsap-frameworks 266) + llms.txt + examples/ (vue,
   nuxt, vanilla, react — 18 files) + .github/instructions/ (react,
   scrolltrigger) + AGENTS.md + README + assets/ (4 SVGs).
4. Copied text-only (scoped) to `skills/vendor/gsap-skills/gsap-skills/`
   with excludes: `.git/`, `.gitignore`, `assets/` (SVGs binary),
   `.claude-plugin/`, `.cursor-plugin/`, `GEMINI.md`, `CLAUDE.md`. Copied
   `LICENSE` to vendor root.
5. Binary scan: 0 binary/image/font/compressed in vendored tree. 33 files
   UTF-8 text.
6. Generated `docs/gsap-skills/source-lock.json` — 1 vendor entry, 33 files
   in skill dir + LICENSE, 8 critical_file_hashes (one SKILL.md per
   sub-skill), MIT attribution, known risks, update procedure.
7. Wrote `docs/gsap-skills/audit-report.md` + `architecture.md`.

## Inventory

- 1 vendor root `skills/vendor/gsap-skills/` (33 text files in skill dir +
  LICENSE).
- `docs/gsap-skills/`: `source-lock.json`, `audit-report.md`,
  `architecture.md`, `verification-report.md` (this file).

### Files vendored (critical; full per-file sha256 in source-lock.json)

| path                                     | sha256                                                             |
| ---------------------------------------- | ------------------------------------------------------------------ |
| `skills/vendor/gsap-skills/LICENSE`      | `51b04b06556662dd817e8f4aa6d06bc7139dc73739e1319a7233cfde3e147b90` |
| `.../skills/gsap-core/SKILL.md`          | (see source-lock.json)                                             |
| `.../skills/gsap-timeline/SKILL.md`      | (see source-lock.json)                                             |
| `.../skills/gsap-scrolltrigger/SKILL.md` | (see source-lock.json)                                             |
| `.../skills/gsap-plugins/SKILL.md`       | (see source-lock.json)                                             |
| `.../skills/gsap-react/SKILL.md`         | (see source-lock.json)                                             |

## Gates

Vendor excluded from toolchain (`skills/vendor/**`). `verify:skills`
unaffected (vendor bypasses reconcile RCN-009). Ledger 387/387 unchanged
(vendors not authored-eligible).
Run (pending): `pnpm check:repo && pnpm verify:skills && pnpm typecheck &&
pnpm lint && pnpm test && pnpm format:check && pnpm ledger:generate`.

## Risks

- `examples/` declare framework build deps (vite, vue, react, nuxt) in
  `package.json`; vendored as text reference only (not installed).
- `assets/` SVGs excluded as binaries (logos, not doctrine).
- GSAP is a runtime dep of the user's project (not this repo); homólogo
  teaches API usage, does not auto-install.

## Next gate

`design-gsap-motion` homólogo (H-03, code `GSM`): SKILL.md + LINEAGE.yml +
fixtures + check-skill.mjs + runtime-boundary.yml, H-03 validator entry,
`creation-v3-skill-registry.yml` entry + 4 append-only events, hashes,
baseline update + ledger regen. Complements existing `motion-library-adapters`.
