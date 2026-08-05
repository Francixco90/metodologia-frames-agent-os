# vercel-agent-skills vendor verification — Fase 1D

> Verification date: 2026-08-04 · Verifier: lead (distinct from producer).

## Hash verification

| file                                                               | expected (source-lock.json)                                        | actual (sha256)                                                    | match |
| ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ----- |
| `skills/vendor/vercel-agent-skills/web-design-guidelines/SKILL.md` | `f4647ca866a3accf763777f83e7682954f0187cd6bea7eea0399796652414e8f` | `f4647ca866a3accf763777f83e7682954f0187cd6bea7eea0399796652414e8f` | ✅    |
| `skills/vendor/vercel-agent-skills/LICENSE`                        | `661142e53c313d2bb5e1b055f5c0a39001450ff1b5e27b89dc4bc7de9a6352ca` | `661142e53c313d2bb5e1b055f5c0a39001450ff1b5e27b89dc4bc7de9a6352ca` | ✅    |

## Gates

| gate                        | result | notes                                                                            |
| --------------------------- | ------ | -------------------------------------------------------------------------------- |
| `pnpm check:repo`           | PASS   | vendor dirs excluded from structure checks                                       |
| `pnpm verify:contributions` | PASS   | vendors not in registries                                                        |
| `pnpm typecheck`            | PASS   | `skills/vendor/**` excluded from tsconfig                                        |
| `pnpm lint`                 | PASS   | `skills/vendor/**` excluded from eslint                                          |
| `pnpm test`                 | PASS   | no test surface for vendors                                                      |
| `pnpm format:check`         | note   | `.claude/settings.local.json` gitignored false-positive (risk #11), passes on CI |
| `git status`                | clean  | 2 files tracked, 0 binaries                                                      |
| `file` content-type         | text   | all 2 files UTF-8 text, 0 binary leaks                                           |

## License compliance

- MIT declared in repo README `## License MIT`.
- No LICENSE file in `skills/web-design-guidelines/` folder — LICENSE file created
  at vendor root (`skills/vendor/vercel-agent-skills/LICENSE`) from README
  declaration (standard MIT text + "Copyright (c) 2026 Vercel, Inc." attribution).
- MIT-compatible with `LicenseRef-MetodologIA-Internal` homólogo derivation
  (`clean-room-prose-from-permissive-reference`).

## Exclusions verified

- 8 other vercel-labs/agent-skills folders NOT vendored (composition-patterns,
  deploy-to-vercel, react-best-practices, react-native-skills,
  react-view-transitions, vercel-cli-with-tokens, vercel-optimize,
  writing-guidelines).
- 5 `.zip` archives in repo root NOT vendored (deploy-to-vercel.zip,
  react-best-practices.zip, react-view-transitions.zip, vercel-cli-with-tokens.zip,
  web-design-guidelines.zip).
- No `node_modules/`, `dist/`, `.git/`, binaries, images, or fonts copied.

## Verdict

**PASS.** 1 skill, MIT (README-declared), 2 text files vendored (SKILL.md +
created LICENSE), 0 binaries, 0 secrets, hashes match, toolchain isolated.
Ready for `design-web-design-guidelines` homólogo (Fase 2C).
