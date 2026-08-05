# anthropics-skills vendor verification — Fase 1D

> Verification date: 2026-08-04 · Verifier: lead (distinct from producer).

## Hash verification

| file                                                          | expected (source-lock.json)                                        | actual (sha256)                                                    | match |
| ------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ----- |
| `skills/vendor/anthropics-skills/frontend-design/SKILL.md`    | `1608ea77fbb6fc30d13a97d12cfa8ebf31358d40f0dd97beed24829d6b3f45dd` | `1608ea77fbb6fc30d13a97d12cfa8ebf31358d40f0dd97beed24829d6b3f45dd` | ✅    |
| `skills/vendor/anthropics-skills/frontend-design/LICENSE.txt` | `0d542e0c8804e39aa7f37eb00da5a762149dc682d7829451287e11b938e94594` | `0d542e0c8804e39aa7f37eb00da5a762149dc682d7829451287e11b938e94594` | ✅    |
| `skills/vendor/anthropics-skills/LICENSE`                     | `0d542e0c8804e39aa7f37eb00da5a762149dc682d7829451287e11b938e94594` | `0d542e0c8804e39aa7f37eb00da5a762149dc682d7829451287e11b938e94594` | ✅    |

## Gates

| gate                        | result | notes                                                                            |
| --------------------------- | ------ | -------------------------------------------------------------------------------- |
| `pnpm check:repo`           | PASS   | vendor dirs excluded from structure checks                                       |
| `pnpm verify:contributions` | PASS   | vendors not in registries                                                        |
| `pnpm typecheck`            | PASS   | `skills/vendor/**` excluded from tsconfig                                        |
| `pnpm lint`                 | PASS   | `skills/vendor/**` excluded from eslint                                          |
| `pnpm test`                 | PASS   | no test surface for vendors                                                      |
| `pnpm format:check`         | note   | `.claude/settings.local.json` gitignored false-positive (risk #11), passes on CI |
| `git status`                | clean  | 5 files tracked, 0 binaries                                                      |
| `file` content-type         | text   | all 3 files UTF-8 text, 0 binary leaks                                           |

## License compliance

- Apache-2.0 verified via `LICENSE.txt` (Apache License Version 2.0 header).
- Attribution preserved: "Copyright (c) 2026 Anthropic, Inc." in LICENSE.txt.
- Apache-2.0-compatible with `LicenseRef-MetodologIA-Internal` homólogo derivation
  (`clean-room-prose-from-permissive-reference`).

## Exclusions verified

- 16 other anthropics/skills folders NOT vendored (doc skills docx/pdf/pptx/xlsx
  source-available, algorithmic-art, brand-guidelines, canvas-design,
  doc-coauthoring, internal-comms, mcp-builder, skill-creator, slack-gif-creator,
  theme-factory, web-artifacts-builder, webapp-testing).
- No `node_modules/`, `dist/`, `.git/`, binaries, images, or fonts copied.

## Verdict

**PASS.** 1 skill, Apache-2.0, 3 text files vendored (SKILL.md + 2 LICENSE
copies), 0 binaries, 0 secrets, hashes match, toolchain isolated. Ready for
`design-frontend-design` homólogo (Fase 2B).
