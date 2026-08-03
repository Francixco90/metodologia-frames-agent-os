# HyperFrames vendor audit — Fase 0

> Audit date: 2026-08-03 · Auditor: lead · Source: `heygen-com/hyperframes` @
> `3cf268e1e54b9f1868442a37b7bfafecc0e2355f` (v0.7.90) · License: Apache-2.0

## Scope

15 skills vendored text-only into `skills/vendor/hyperframes/` as **reference-only**
input for the locally-authored `content-os-*` skills (Content OS Fases 2-4). 646 files
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

## Verdict

**APPROVED for vendor.** All 15 skills pass the text-only, no-secret,
no-auto-execution, Apache-2.0-attribution checks. Noted risks are documented in
`source-lock.json` per-vendor `known_risks` and are addressed by the Fase 2-4
adaptation contract (locally-authored, fail-closed, hash-bound, offline-first with
opt-in remote behind auth gating).

## Update procedure

1. Clone `heygen-com/hyperframes` at the new commit (`GIT_LFS_SKIP_SMUDGE=1` or with
   `git-lfs` installed).
2. Re-run `vendor-copy.mjs` (text-only filter).
3. Re-audit per this checklist; update `known_risks` if new network/auth patterns.
4. Regenerate `source-lock.json` (commit + hashes).
5. Run `pnpm check:repo && pnpm typecheck && pnpm lint && pnpm test && pnpm format:check`.
