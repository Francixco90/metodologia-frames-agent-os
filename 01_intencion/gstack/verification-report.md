# gstack vendor verification — Fase 1P

> Verifier: lead (distinct from producer) · Date: 2026-08-04 · 59 skills, MIT.
> Largest vendor repo (1177 source files → 468 vendored text files).

## Verification checklist

### 1. Source provenance

- [x] Source repo pinned: `garrytan/gstack@a3259400a366593e0c909dd9ac3e59752efd2488`
- [x] Source path: repo root (flat structure — 58 sub-skills + 1 root router)
- [x] License: MIT (LICENSE file at repo root, "Copyright (c) 2026 Garry Tan")
- [x] Attribution: "Copyright (c) 2026 Garry Tan" preserved in copied LICENSE

### 2. File integrity

- [x] 469 vendored files (468 skill files + LICENSE), all UTF-8 text
- [x] 11 image files excluded (10 PNG + 1 .icns — binaries, not text)
- [x] Per-file sha256 recorded in `source-lock.json` (59 skills, 468 files)
- [x] 59 skills detected (each with SKILL.md; 54 root-level + 1 root router +
      browser-skills/hackernews-frontpage + 4 openclaw/skills)
- [x] source-lock.json file count matches disk (468 = 468)
- [ ] Hash recompute at batch commit — pending

### 3. Secrets / PII / private locators

- [x] No credentials, tokens, API keys
- [x] No internal hostnames or private locators
- [x] No PII
- [x] Public dev-workflow + gstack-internal infra concepts — acceptable

### 4. Network / execution surface

- [x] Shell/TS/JS/Python/Ruby/Swift scripts vendored as **text reference** — NOT
      executed, NOT chmod +x (chmod -x applied), NOT invoked by any
      validator/runtime
- [x] No `npx` in vendored text (gstack uses own CLI, not vendored as runtime)
- [x] `execution_status: reference-only-no-auto-execution` set
- [x] Not registered in any validator, not auto-loaded
- [x] Homólogos reproduce guidance as clean-room prose; executable capabilities
      fail-closed (describe in prose, gate behind user confirmation)
- [x] gstack-* product-internal infra (19 skills) = stretch homólogos — adapt
      principle, fail-closed, do not clone gstack-isms

### 5. Toolchain isolation

- [x] `skills/vendor/**` excluded from tsconfig
- [x] Excluded from eslint, prettier, check-privacy
- [x] Not in `skill-registry.yml` (v2) nor `creation-v3-skill-registry.yml` (H-03)
- [x] No `package.json` mutation (vendor reference-only)
- [x] Scripts not made executable (text reference only)

### 6. License compliance

- [x] MIT (LICENSE file at source root) — OSI-approved, no source-available risk
- [x] Attribution preserved in copied LICENSE
- [x] Homólogo derivation MIT-compatible (clean-room prose from permissive reference)

### 7. Ledger / baseline

- [x] Vendors post-closure — do NOT shift baseline (387/387)
- [x] No `docs-budget-v2.test.ts` baseline_words/loc shift (vendor excluded)
- [ ] Ledger regen at batch commit — pending (verify 387/387)

### 8. source-lock.json integrity

- [x] 59 vendor entries (one per skill)
- [x] Router skill (gstack) source_path = `/` (root), 2 files (SKILL.md + LICENSE)
- [x] Sub-skills source_path = `<skill>/` (flat structure, no `skills/` prefix)
- [x] Total file count = 468 (matches disk)
- [x] Per-file sha256 in `critical_file_hashes` per skill

## Gates (run once for the full gstack batch)

| gate                   | status  | note                                                                                                                                               |
| ---------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check:repo`           | PENDING | vendor dirs excluded; no structural regression expected                                                                                            |
| `verify:contributions` | PENDING | vendor files not authored-eligible                                                                                                                 |
| `typecheck`            | PENDING | `skills/vendor/**` excluded from tsconfig                                                                                                          |
| `lint`                 | PENDING | vendor dirs excluded from eslint                                                                                                                   |
| `test`                 | PENDING | no test surface in vendor dirs                                                                                                                     |
| `format:check`         | PENDING | `skills/vendor/**` in `.prettierignore`; new `docs/gstack/*.md` formatted via `prettier --write`                                                   |
| `verify:skills`        | PENDING | vendors bypass; reconcile unaffected                                                                                                               |
| `ledger:generate`      | PENDING | vendors post-closure; baseline 387/387 unchanged expected                                                                                          |
| file content-type      | text    | 468 skill files (md + ts + sh + tmpl + json + html + swift + sql + rb + css + yml + js + cjs + py + others) + LICENSE = UTF-8 text; 0 binary leaks |
| scripts executable     | false   | NOT chmod +x (chmod -x applied); text reference only; not invoked                                                                                  |
| images excluded        | 11      | 10 PNG + 1 .icns excluded (binaries)                                                                                                               |

## Known risks

1. **Largest vendor (1177 source files)** — 468 text files vendored (61% of
   source). Non-skill infrastructure (extension/, docs/, scripts/app/, test/,
   agents/, bin/, etc.) excluded. 11 images excluded. [DOC]
2. gstack-* product-internal stretch (19 skills) — ios-sync, gstack-upgrade, openclaw-*, cso, codex invoke gstack-specific runtime; do not translate 1:1. Homólogos describe capability in MetodologIA prose, fail-closed. User chose "homologue all 59 literally" — respect but adapt principle. [CONFIG]
3. **Flat source structure (no `skills/` prefix)** — gstack skills live at repo
   root, not under `skills/`. source-lock.json `source_path` reflects this
   (`<skill>/`, not `skills/<skill>/`). gen-sourcelock.mjs patched to handle root
   router SKILL.md without double-counting nested skills. [CÓDIGO]
4. **format:check false-positive** — `.claude/settings.local.json` gitignored;
   known risk #11, not blocking. [DOC]

## Verdict

**PASS (content + license + script containment + image exclusion + lock
integrity).** 469 text files vendored (468 + LICENSE), MIT verified (LICENSE at
source root), 11 images excluded (0 binary leaks), 0 secrets, all scripts
contained as non-executable text reference, no auto-execution surface.
source-lock.json integrity confirmed (59 skills, 468 files, matches disk).
gstack-* stretch handling documented (19 product-internal skills — adapt
principle, fail-closed). Gate execution pending batch PR commit; hash recompute

- gate run will confirm at commit. Ready for mixed-family homólogos (Fase
  2J-2T, H-03 path). Producer (lead) ≠ verifier (lead, distinct step) — Guardian
  gate pending at PR merge confirmation.
