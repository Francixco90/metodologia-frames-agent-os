# taste-skill vendor verification — Fase 1E

> Verification date: 2026-08-04 · Verifier: lead (distinct from producer).

## Hash verification

All 16 vendored files match `source-lock.json` hashes (sha256 recomputed
post-copy). See `critical_file_hashes` per skill in
[`source-lock.json`](./source-lock.json) + `vendor_root_hashes` for LICENSE +
llms.txt. All ✅.

## Gates

| gate                        | result | notes                                                                            |
| --------------------------- | ------ | -------------------------------------------------------------------------------- |
| `pnpm check:repo`           | PASS   | vendor dirs excluded from structure checks                                       |
| `pnpm verify:contributions` | PASS   | vendors not in registries                                                        |
| `pnpm typecheck`            | PASS   | `skills/vendor/**` excluded from tsconfig                                        |
| `pnpm lint`                 | PASS   | `skills/vendor/**` excluded from eslint                                          |
| `pnpm test`                 | PASS   | no test surface for vendors                                                      |
| `pnpm format:check`         | note   | `.claude/settings.local.json` gitignored false-positive (risk #11), passes on CI |
| `git status`                | clean  | 16 files tracked, 0 binaries                                                     |
| `file` content-type         | text   | all 16 files UTF-8 text, 0 binary leaks                                          |

## License compliance

- MIT verified via repo root `LICENSE` (`MIT License`, `Copyright (c) 2026
Leonxlnx`).
- LICENSE copied to vendor root (`skills/vendor/taste-skill/LICENSE`).
- MIT-compatible with `LicenseRef-MetodologIA-Internal` homólogo derivation
  (`clean-room-prose-from-permissive-reference`).

## Exclusions verified

- Repo assets/*.webp, *.png, *.svg (readme-banner.webp, taste-skill-logo.png,
  vercel-oss-program-badge.svg, readme-cta-tasteskill.svg, taste-skill-logo.webp)
  NOT vendored.
- examples/*.webp (floria-top.webp, floria-full.webp, floria-bottom.webp) NOT
  vendored.
- scripts/*.mjs (convert-readme-assets-webp.mjs, process-readme-buttons.mjs,
  process-sponsor-badge.mjs, build-emil-sponsor-row.mjs) NOT vendored.
- .github/, .claude-plugin/, research/laziness/** NOT vendored.
- CHANGELOG.md, README.md, skill.sh NOT vendored.
- No `node_modules/`, `dist/`, `.git/`, binaries copied.

## Verdict

**PASS.** 13 skills, MIT, 16 text files vendored (13 SKILL.md + 1 DESIGN.md +
LICENSE + llms.txt), 0 binaries, 0 secrets, hashes match, toolchain isolated.
Ready for 13 homólogos (12 design-* + 1 dev-*, Fase 2B-2E + expansion, H-03
path).
