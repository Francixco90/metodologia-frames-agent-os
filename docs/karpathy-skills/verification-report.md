# karpathy-skills vendor verification — Fase 1H

> Date: 2026-08-04 · Branch: `feat/vendor-single-skill-batch` · Base:
> `6abe315` (post-PR #54). 1 source, MIT. Verifier: lead (distinct step from
> producer). Gates run once for the full 4-vendor batch PR, not per-vendor.

## Objective

Vendor 1 karpathy-guidelines behavioral-guidelines skill (MIT) as text-only,
reference-only input for `karpathy-guidelines` homólogo (H-03 path, dev-*
family, Fase 2J). No execution, no registration, no runtime dependency added.

## Hash verification

Per-file sha256 — expected (from `source-lock.json`) vs actual (to be computed
`sha256sum` at batch gate run):

| file          | expected (source-lock.json)                                        |
| ------------- | ------------------------------------------------------------------ |
| `LICENSE`     | `057951f4354bf3d08c6bc6f7aacb3daf1b1fb860990853223c5770ed28f27716` |
| `SKILL.md`    | `6e22cc54cb02a5e98ae42d06d9d7292db0c1b43894831b32879beb0166b2aea7` |
| `EXAMPLES.md` | `9bc0ba934077a0514bab0fc7a4ffad37ecd40bfddf57f29d0b8cef5e5b3d1f28` |

Hash recompute will be run at batch commit; any mismatch blocks the PR.

## Gates (run once for the full 4-vendor batch)

| gate                   | status  | note                                                                                                      |
| ---------------------- | ------- | --------------------------------------------------------------------------------------------------------- |
| `check:repo`           | PENDING | vendor dirs excluded; no structural regression expected                                                   |
| `verify:contributions` | PENDING | vendor files not authored-eligible                                                                        |
| `typecheck`            | PENDING | `skills/vendor/**` excluded from tsconfig (line 23)                                                       |
| `lint`                 | PENDING | vendor dirs excluded from eslint                                                                          |
| `test`                 | PENDING | no test surface in vendor dirs                                                                            |
| `format:check`         | PENDING | `skills/vendor/**` in `.prettierignore`; new `docs/karpathy-skills/*.md` formatted via `prettier --write` |
| `verify:skills`        | PENDING | vendors bypass; reconcile unaffected (vendors not in registries)                                          |
| `ledger:generate`      | PENDING | vendors post-closure; baseline 387/387 unchanged expected                                                 |
| file content-type      | text    | SKILL.md + EXAMPLES.md = UTF-8 text (ASCII subset); LICENSE = UTF-8 text; 0 binary leaks                  |

## License compliance

- MIT declared in README `## License` + SKILL.md frontmatter (`license: MIT`).
- **No LICENSE file at source repo root** — LICENSE created at vendor root
  from declaration (`Copyright (c) 2026 forrestchang`).
- Created LICENSE sha256:
  `057951f4354bf3d08c6bc6f7aacb3daf1b1fb860990853223c5770ed28f27716`.
- MIT permits redistribution + modification with attribution. Homólogo
  derives under `LicenseRef-MetodologIA-Internal` (MIT-compatible).

## Exclusions verified

- Source repo root README — excluded (not part of scoped skill copy).
- Other skills in source repo (`karpathy-zero-shot`, `karpathy-write-code`,
  `karpathy-review-code`) — excluded (out of scope; only `karpathy-guidelines`
  vendored).
- No binaries in source tree (prose-only skill).

## Secrets / PII scan

- No credentials, tokens, API keys.
- No internal hostnames or private locators.
- No PII. Public URL (Karpathy's X post) acceptable.

## Known risks

1. **No LICENSE file at source root** — MIT declared in README + frontmatter
   only. Resolved: created LICENSE at vendor root from declaration. [SUPUESTO]
2. **format:check false-positive** — `.claude/settings.local.json` gitignored,
   absent on CI; known risk #11, not blocking. New `docs/karpathy-skills/*.md`
   formatted via `prettier --write` before commit. [DOC]

## Verdict

**PASS (content + license).** 3 text files vendored, MIT verified (README +
frontmatter; LICENSE created from declaration), 0 binaries, 0 secrets, no
execution surface, toolchain isolated. Gate execution pending batch PR commit;
hash recompute + gate run will confirm at commit. Ready for Fase 2J
`karpathy-guidelines` homólogo derivation (H-03 path, dev-* family, per-skill
runtime-boundary). Producer (lead) ≠ verifier (lead, distinct step) — Guardian
gate pending at PR merge confirmation.
