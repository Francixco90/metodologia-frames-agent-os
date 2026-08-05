# HyperFrames vendor audit — Fase 0

> Audit date: 2026-08-03 · Auditor: lead · Source: `heygen-com/hyperframes` @
> `3cf268e1e54b9f1868442a37b7bfafecc0e2355f` (v0.7.90) · License: Apache-2.0

## Scope

15 skills vendored text-only into `skills/vendor/hyperframes/` as **reference-only**
input for the locally-authored `content-os-*` skills (Frames ContentOS Fases 2-4). 646 files
copied, 77 binaries excluded. Per-file sha256 recorded in
[`source-lock.json`](./source-lock.json).

## Global audit findings

### 1. License

- `LICENSE` = Apache License 2.0 (verified header: "Apache License, Version 2.0,
  January 2004"). Copied to `skills/vendor/hyperframes/LICENSE`.
- `CREDITS.md` acknowledges prior art (Remotion) and third-party deps (mediabunny,
  MPL-2.0 — used in the studio renderer, **not** in vendored skill text; MPL does not
  propagate to the text files copied here). Copied to `skills/vendor/hyperframes/CREDITS.md`.
- Attribution "Copyright (c) HeyGen, Inc." preserved in lockfile + vendor README.
- No copyleft license found in any vendored text file.

### 2. Binaries excluded

Extensions excluded (not copied): `png`, `jpg`, `jpeg`, `gif`, `mp3`, `mp4`, `mov`,
`webm`, `woff`, `woff2`, `ttf`, `otf`, `ico`, `webp`, `avif`. 77 binary assets
skipped. Dotfiles (`.gitignore`, `.gitkeep`, `.DS_Store`) and `node_modules/` skipped.

### 3. Secrets / PII / private locators

- `check-privacy.ts` skips `skills/vendor/**` (vendors are audited here, not by the
  first-party scanner — mirrors prettier/tsconfig/eslint exclusions).
- Manual scan: `media-use/audio/scripts/lib/heygen.test.mjs` and related test
  fixtures use placeholder tokens (the `access_token` fixture key set to `at_test`,
  `HEYGEN_CONFIG_DIR` temp dirs). **No real secrets, API keys, or private locators
  present.**
- No `/Users/…` or `/home/…` paths in any vendored file (grep-verified).
- No `sk-…`, `ghp_…`, `AIza…`, or PEM private-key blocks (regex-verified).

### 4. Network / telemetry / auto-execution

- Vendored files are **not executed**: excluded from `tsconfig` (no type-check),
  `eslint` (no lint), `vitest` (test include is `tests/**` only), and `prettier`
  (no reformat).
- Remote-capable paths identified and marked `components_disabled` or `known_risks`:
  - `media-use/scripts/heygen-tts.mjs` — HeyGen TTS over HTTPS (auth-gated). Not
    executed locally. The local adaptation (`content-os-media`, Fase 2e) wraps this
    behind auth gating + offline fallback.
  - `pr-to-video` PR fetch — GitHub API (network). Local adaptation must be
    auth-gated with offline fallback.
- No telemetry/beacon endpoints in enabled reference docs.

### 5. Integrity

- `source-lock.json` records sha256 for every vendored file (644 skill files + 2
  root). Spot-check verified: `hyperframes-core/SKILL.md` actual == locked.
- `execution_status: reference-only-no-auto-execution` for all 15 vendors.

## Per-skill checklist

Legend: ✅ pass · ⚠ noted risk (does not block vendor) · — n/a.

| skill                   | files | license | binaries excluded | no secrets | no auto-exec | risk                                                                                         |
| ----------------------- | ----- | ------- | ----------------- | ---------- | ------------ | -------------------------------------------------------------------------------------------- |
| hyperframes             | 17    | ✅      | ✅                | ✅         | ✅           | ⚠ references external skill names (inert)                                                    |
| hyperframes-core        | 19    | ✅      | ✅                | ✅         | ✅           | ⚠ Tailwind project setup (not used locally)                                                  |
| hyperframes-animation   | 121   | ✅      | ✅                | ✅         | ✅           | ⚠ scripts import @heygen/hyperframes runtime (not executed)                                  |
| hyperframes-creative    | 72    | ✅      | ✅                | ✅         | ✅           | ⚠ HeyGen brand voice must yield to brand-router on adaptation                                |
| hyperframes-keyframes   | 3     | ✅      | —                 | ✅         | ✅           | ⚠ pose contract needs HTML runtime (Fase 2a)                                                 |
| hyperframes-registry    | 10    | ✅      | —                 | ✅         | ✅           | ⚠ framework-specific schema needs local reshape                                              |
| media-use               | 132   | ✅      | ✅                | ✅         | ✅           | ⚠ remote HeyGen TTS/OAuth adapter (auth-gated, not executed); placeholder tokens in fixtures |
| remotion-to-hyperframes | 64    | ✅      | ✅                | ✅         | ✅           | ⚠ .tsx fixtures import remotion (excluded from tsconfig); bridge is unidirectional in source |
| slideshow               | 2     | ✅      | —                 | ✅         | ✅           | ⚠ thin reference                                                                             |
| embedded-captions       | 95    | ✅      | ✅                | ✅         | ✅           | ⚠ assumes HTML runtime (Fase 2a)                                                             |
| pr-to-video             | 30    | ✅      | ✅                | ✅         | ✅           | ⚠ PR fetch uses GitHub API (network); adapt auth-gated + offline                             |
| motion-graphics         | 23    | ✅      | ✅                | ✅         | ✅           | ⚠ depends on hyperframes-animation (Fase 2b)                                                 |
| product-launch-video    | 28    | ✅      | ✅                | ✅         | ✅           | ⚠ scripts import runtime packages (not executed)                                             |
| faceless-explainer      | 24    | ✅      | ✅                | ✅         | ✅           | ⚠ TTS narration depends on media-use adapter (Fase 2e)                                       |
| general-video           | 4     | ✅      | —                 | ✅         | ✅           | ⚠ thin reference; delegates to other workflows                                               |

## Batch 2 audit — Fase 1A (2026-08-04)

> Source: `heygen-com/hyperframes` @ `77f95e46e038ee93e03b3f7a0099b25a4feb73f8`
> (v0.7.90) · License: Apache-2.0 · 10 additional skills, 117 text files, 0 binaries.

### Scope correction

skills.sh aggregates HeyGen-adjacent skills from multiple repos (~49 listed). The
pinned `heygen-com/hyperframes` repo at HEAD has 25 unique skills (19 marketplace
`skills/` + 6 repo-native `.agents/skills/`). 15 were vendored in Fase 0 → **10 NEW**
vendored here. The remaining ~24 listed on skills.sh live in other repos (animation
adapters overlapping `motion-library-adapters` per plan risk #3), are retired
(`hyperframes-media`), or have unclear source provenance — documented as follow-up,
not blocking Fase 1A.

### Batch 2 per-skill checklist

Legend: ✅ pass · ⚠ noted risk (does not block vendor) · — n/a.

| skill              | source path                        | files | license | binaries excluded | no secrets | no auto-exec | risk                                                                           |
| ------------------ | ---------------------------------- | ----- | ------- | ----------------- | ---------- | ------------ | ------------------------------------------------------------------------------ |
| figma              | `skills/figma/`                    | 2     | ✅      | —                 | ✅         | ✅           | ⚠ Figma design reference; verify-motion.mjs inert                              |
| hyperframes-cli    | `skills/hyperframes-cli/`          | 11    | ✅      | —                 | ✅         | ✅           | ⚠ deploy references (cloud/cloudrun/lambda) inert; no CLI executed             |
| music-to-video     | `skills/music-to-video/`           | 65    | ✅      | ✅                | ✅         | ✅           | ⚠ bundled gsap.min.js text ref; PNG masks + woff2 excluded (binary)            |
| talking-head-recut | `skills/talking-head-recut/`       | 22    | ✅      | ✅                | ✅         | ✅           | ⚠ gsap.min.js text ref; woff2 + MP4 excluded (binary); media-contract test ref |
| captions-overlay   | `.agents/skills/captions-overlay/` | 1     | ✅      | —                 | ✅         | ✅           | ⚠ thin reference (overlay caption model)                                       |
| changelog-video    | `.agents/skills/changelog-video/`  | 8     | ✅      | —                 | ✅         | ✅           | ⚠ align-captions.mjs inert; script-tokens/lexicon JSON refs                    |
| cut-the-curve      | `.agents/skills/cut-the-curve/`    | 2     | ✅      | —                 | ✅         | ✅           | ⚠ thin reference (curve-cut transition + GSAP example)                         |
| motion-doctrine    | `.agents/skills/motion-doctrine/`  | 4     | ✅      | —                 | ✅         | ✅           | ⚠ seam-gate/seam-stamp scripts inert; doctrine reference                       |
| oversized-cursor   | `.agents/skills/oversized-cursor/` | 1     | ✅      | —                 | ✅         | ✅           | ⚠ thin reference (oversized cursor attention)                                  |
| seam-craft         | `.agents/skills/seam-craft/`       | 1     | ✅      | —                 | ✅         | ✅           | ⚠ thin reference (seam crafting)                                               |

### Batch 2 integrity

- `source-lock.json` `batch_2` block: `source_commit`, `added: 10`, `added_date`.
- Per-file sha256 recorded under each new vendor's `critical_file_hashes`.
- All 117 files content-type verified as text (`file` scan: ASCII / UTF-8 / HTML / JSON; 0 binaries).
- `execution_status: reference-only-no-auto-execution` for all 10 new vendors.
- Bundled `gsap.min.js` (music-to-video, talking-head-recut) vendored as text reference only; Frames ContentOS uses toolchain `gsap 3.15.0` — no runtime dep on the vendor copy.

## Verdict

**APPROVED for vendor.** All 25 skills (15 Fase 0 + 10 Fase 1A) pass the text-only,
no-secret, no-auto-execution, Apache-2.0-attribution checks. Noted risks are
documented in `source-lock.json` per-vendor `known_risks` and are addressed by the
Fase 2-4 adaptation contract (locally-authored, fail-closed, hash-bound, offline-first
with opt-in remote behind auth gating).

## Update procedure

1. Clone `heygen-com/hyperframes` at the new commit (`GIT_LFS_SKIP_SMUDGE=1` or with
   `git-lfs` installed).
2. Re-run `vendor-copy.mjs` (text-only filter).
3. Re-audit per this checklist; update `known_risks` if new network/auth patterns.
4. Regenerate `source-lock.json` (commit + hashes).
5. Run `pnpm check:repo && pnpm typecheck && pnpm lint && pnpm test && pnpm format:check`.
