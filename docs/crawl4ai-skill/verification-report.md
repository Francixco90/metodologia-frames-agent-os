# crawl4ai-skill vendor verification — Fase 1K

> Verifier: lead (distinct from producer) · Date: 2026-08-04 · 1 skill, MIT OR
> Apache-2.0 (dual). **FAIL-CLOSED tool skill.** Gates run once for the full
> 4-vendor batch PR.

## Verification checklist

### 1. Source provenance

- [x] Source repo pinned: `brettdavies/crawl4ai-skill@c696921b133dd962f766f596655767c0b894d206`
- [x] Source path: `/` (repo root)
- [x] License: MIT OR Apache-2.0 (dual; LICENSE + LICENSE-MIT + LICENSE-APACHE
      at repo root, "Copyright (c) 2026 Brett Davies")
- [x] Attribution: "Copyright (c) 2026 Brett Davies" preserved in 3 copied LICENSEs
- [x] Homologue derives under MIT (chosen permissive basis from dual; both
      OSI-approved, both compatible with `LicenseRef-MetodologIA-Internal`)

### 2. File integrity

- [x] 17 vendored files (SKILL.md + 9 references + 5 evals + 3 LICENSE files),
      all UTF-8 text
- [x] 0 binaries (file scan: no executable/image/font/archive in vendored set)
- [x] Per-file sha256 recorded in `source-lock.json`
- [x] SKILL.md hash: `ac9eb874...a0d694a4`
- [x] 9 reference hashes recorded (anti-detection, cli-guide,
      complete-sdk-reference, content-filters, escalation, recipes, sdk-guide,
      troubleshooting, url-discovery)
- [x] 5 eval hashes recorded (README, eval-01, eval-02, eval-03, eval-04)
- [x] 3 LICENSE hashes recorded (LICENSE, LICENSE-MIT, LICENSE-APACHE)
- [ ] Hash recompute at batch commit — pending

### 3. Secrets / PII / private locators

- [x] No credentials, tokens, API keys
- [x] No internal hostnames or private locators
- [x] No PII
- [x] Public concepts (crawl4ai SDK, anti-detection, public eval example URLs) —
      acceptable

### 4. Network / execution surface (FAIL-CLOSED)

- [x] Vendored as **text reference** — no script execution, no network fetch, no
      install, no binary invocation in vendor context
- [x] No `npx` in vendored text; SKILL.md references crawl4ai SDK/CLI but is NOT
      executed in vendor context
- [x] `execution_status: reference-only-no-auto-execution` set
- [x] Not registered in any validator, not auto-loaded
- [x] **Fail-closed homólogo contract**: `execution_boundary: requires_user_confirmation` — homólogo `web-crawl4ai` describes capability in prose and gates execution behind user confirmation. NO auto-execute network/install/binary.

### 5. Toolchain isolation

- [x] `skills/vendor/**` excluded from tsconfig
- [x] Excluded from eslint, prettier, check-privacy
- [x] Not in `skill-registry.yml` (v2) nor `creation-v3-skill-registry.yml` (H-03)
- [x] No `package.json` mutation (vendor reference-only)

### 6. License compliance

- [x] Dual MIT OR Apache-2.0 (3 LICENSE files at source root) — both OSI-approved
- [x] Attribution preserved in 3 copied LICENSEs
- [x] Homólogo derives under MIT (chosen permissive basis; both compatible with
      `LicenseRef-MetodologIA-Internal`)
- [x] Clean-room prose from permissive reference (MIT-compatible)

### 7. Ledger / baseline

- [x] Vendors post-closure — do NOT shift baseline (387/387)
- [x] No `docs-budget-v2.test.ts` baseline_words/loc shift (vendor excluded)
- [ ] Ledger regen at batch commit — pending (verify 387/387)

## Gates (run once for the full 4-vendor batch)

| gate                   | status  | note                                                                                                     |
| ---------------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| `check:repo`           | PENDING | vendor dirs excluded; no structural regression expected                                                  |
| `verify:contributions` | PENDING | vendor files not authored-eligible                                                                       |
| `typecheck`            | PENDING | `skills/vendor/**` excluded from tsconfig                                                                |
| `lint`                 | PENDING | vendor dirs excluded from eslint                                                                         |
| `test`                 | PENDING | no test surface in vendor dirs                                                                           |
| `format:check`         | PENDING | `skills/vendor/**` in `.prettierignore`; new `docs/crawl4ai-skill/*.md` formatted via `prettier --write` |
| `verify:skills`        | PENDING | vendors bypass; reconcile unaffected                                                                     |
| `ledger:generate`      | PENDING | vendors post-closure; baseline 387/387 unchanged expected                                                |
| file content-type      | text    | SKILL.md + 9 references + 5 evals + 3 LICENSE files = UTF-8 text; 0 binary leaks                         |

## Known risks

1. **DUAL license MIT OR Apache-2.0** — 3 LICENSE files at repo root. Homólogo
   derives under MIT for attribution simplicity (both permissive, both
   compatible with `LicenseRef-MetodologIA-Internal`). Dual choice documented in
   audit-report + LINEAGE. [DOC]
2. **TOOL skill — fail-closed required** — crawl4ai invokes SDK/CLI for web
   crawling (network fetch, browser automation). Contained as reference-only
   vendor; homólogo `web-crawl4ai` is fail-closed
   (`requires_user_confirmation`). [CONFIG]
3. **Large vendor set (17 files)** — 14 skill files + 3 LICENSE files. All
   UTF-8 text; source-lock.json captures all per-file hashes. Manageable. [DOC]
4. **format:check false-positive** — `.claude/settings.local.json` gitignored;
   known risk #11, not blocking. New `docs/crawl4ai-skill/*.md` formatted via
   `prettier --write`. [DOC]

## Verdict

**PASS (content + license + fail-closed containment).** 17 text files vendored,
dual MIT OR Apache-2.0 verified (3 LICENSE files at source root; homólogo
derives under MIT), 0 binaries, 0 secrets, no auto-execution surface.
Fail-closed homólogo contract enforced (`requires_user_confirmation`). Gate
execution pending batch PR commit; hash recompute + gate run will confirm at
commit. Ready for `web-crawl4ai` homólogo (Fase 2Q, web-* family, H-03 path,
fail-closed, derives under MIT). Producer (lead) ≠ verifier (lead, distinct
step) — Guardian gate pending at PR merge confirmation.
