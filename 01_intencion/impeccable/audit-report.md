# impeccable vendor audit — Fase 1B

> Audit date: 2026-08-04 · Auditor: lead · 1 skill, Apache-2.0 · Per-file sha256
> in [`source-lock.json`](./source-lock.json).

## Scope

1 generator-based design skill vendored text-only into
`skills/vendor/impeccable/impeccable/` as **reference-only** input for the
locally-authored `design-impeccable` homólogo (Design-OS Fase 2B, H-03 path).
159 text files copied into `impeccable/` + 1 LICENSE at vendor root = 160
total. 0 binaries. Source is **Apache-2.0** (verified).

## Source resolution

| skill        | source repo          | commit    | license    | source path                                        | files vendored      |
| ------------ | -------------------- | --------- | ---------- | -------------------------------------------------- | ------------------- |
| `impeccable` | `pbakaus/impeccable` | `ae5e951` | Apache-2.0 | `skill/` (canonical) + `cli/` + root manifest docs | 159 + LICENSE = 160 |

- **impeccable** (design-language engine): generator-based skill. Canonical
  source `skill/SKILL.src.md` (85 lines) — the design-director doctrine
  (Persuade/Operate/Read/Experience modes, craft floor, anti-AI-slop). Plus
  `skill/agents/` (4 sub-agents: manual-edit-applier, asset-producer,
  documenter, finish-reviewer), `skill/reference/` (35 design-doctrine files:
  new-work, craft-floor, operate, shape, typography, color, motion, ios,
  android, etc.), `skill/scripts/` (86 runtime scripts: context, palette,
  image-gen, live-edit, critique-storage, hooks). `cli/` (25 files): the
  `npx impeccable` engine — antipattern detection, design-system, findings,
  screenshot-contrast, fonts, registry. Root: `DESIGN.md`, `PRODUCT.md`,
  `NOTICE.md`, `package.json`, `README.md`, `README.npm.md`, `biome.json`,
  `skills-lock.json`.

## License

Source is **Apache-2.0** (Copyright pbakaus). Verified via LICENSE file at
repo root (`Apache License, Version 2.0`). Apache-2.0 permits redistribution
and modification with attribution + NOTICE retention. Vendored copy retains
the Apache LICENSE at vendor root (`skills/vendor/impeccable/LICENSE`) and
`NOTICE.md` inside `impeccable/`. Homólogo (`design-impeccable`, Fase 2B)
derives under `LicenseRef-MetodologIA-Internal` with `derivation_mode:
clean-room-prose-from-permissive-reference` (Apache-2.0-compatible;
attribution preserved in LINEAGE.yml).

### Third-party notice

`NOTICE.md` declares `skill/reference/ios.md` and `skill/reference/android.md`
are distilled from `ehmo/platform-design-skills` (MIT, author ehmo) — Apple
HIG and Material Design 3 rules rewritten in Impeccable's voice. MIT-
compatible; attribution preserved in vendored `NOTICE.md`.

## Global audit findings

### 1. License — Apache-2.0 (verified)

- Apache-2.0 per repo: LICENSE file content (`Apache License, Version 2.0`).
- LICENSE copied to vendor root (`skills/vendor/impeccable/LICENSE`).
- `NOTICE.md` copied inside `impeccable/` (ehmo/platform-design-skills MIT
  derivation for ios.md/android.md reference files).
- No source-available / NOT-OSI risk. No license addendum required.

### 2. Binaries excluded

None. All 160 vendored files are text (`.md`, `.mjs`, `.js`, `.json`, `.css`,
`.html`, `.txt`). `file` reports node scripts as `text executable` (shebang
`#!/usr/bin/env node`) — ASCII/UTF-8 text, not binaries. No images, fonts,
compressed, or compiled artifacts.

### 3. Secrets / PII / private locators

None expected in skill/cli/reference text. (Hash-locked via source-lock.json;
any secret-like token would surface as a deterministic hash but content is
public Apache-2.0 design doctrine + CLI source.) No credentials, tokens,
internal hostnames, or PII in vendored text.

### 4. Network / execution surface

impeccable's `cli/` is the `npx impeccable` engine (antipattern detection,
screenshots, design-system generation). `skill/scripts/` includes image-gen,
live-edit, palette, context-loading scripts. Vendored as **reference-only** —
not executed, not registered, not wired into any validator, not on PATH.
Homólogo `design-impeccable` (Fase 2B) will describe the design-doctrine
capability in clean-room prose and gate any execute/screenshot/install behind
explicit user confirmation (fail-closed, per `RENDERED_DRAFT != ... !=
PUBLISHED` and "no activar conectores ni publicar"). `check-skill.mjs`
self-contained (no import of vendor CLI/scripts).

### 5. Excluded (not vendored)

- 16 agent-platform install copies (`.claude/skills/impeccable/`,
  `.cursor/`, `.gemini/`, `.grok/`, `.qoder/`, `.trae/`, `.trae-cn/`,
  `.vibe/`, `.kiro/`, `.pi/`, `.rovodev/`, `.opencode/`, `.agents/`,
  `.github/skills/`, `plugin/skills/`) — redundant distribution targets,
  identical content, NOT vendored.
- `tests/` (89 files) — CLI runtime test fixtures, not design reference.
- `extension/`, `demos/`, `docs/` (6 dev ADRs: DEVELOP, HARNESSES, STYLE,
  LIVE-REWRITE-PLAN, adr-live-variant-mode, openai-plugin-submission) —
  distribution/dev infra.
- `scripts/` root (20 files: build, release, test, benchmark, ci-plan) —
  build/release/test infra, not design reference.
- `bun.lock`, `node_modules/`, `.git/`, `.impeccable/` (runtime cache),
  `.codex/`, `.github/` (workflows), `.cursor/`, `.grok/`, etc.

### 6. Content-type verification

All 160 files text (UTF-8/ASCII). 0 binary leaks.

## Per-skill checklist

### impeccable

- [x] License: Apache-2.0 (verified, LICENSE copied to vendor root)
- [x] Attribution: "Copyright (c) pbakaus" + NOTICE.md (ehmo MIT derivation)
- [x] Source commit pinned: `ae5e951` (`Sync generated provider output`)
- [x] Text-only: 159 files under `impeccable/` + 1 LICENSE, 0 binaries
- [x] No secrets/PII/private locators
- [x] `execution_status: reference-only-no-auto-execution`
- [x] Per-file sha256 in `source-lock.json` (159 hashes + vendor_root_hashes
      LICENSE)
- [x] Source canónico `skill/SKILL.src.md` vendored (NOT the platform copies)
- [x] CLI `cli/` (25 files) vendored text-only (NOT executable in vendor
      context)

## Verdict

**PASS.** 1 generator-based skill, Apache-2.0, 160 text files vendored, 0
binaries, 0 secrets. Ready for Fase 2B `design-impeccable` homólogo derivation
(H-03 path, per-skill runtime-boundary).
