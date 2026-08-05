# rembg-bg-removal vendor verification — Fase 1J

> Verifier: lead (distinct from producer) · Date: 2026-08-04 · 1 skill, MIT.
> **FAIL-CLOSED tool skill.** Gates run once for the full 4-vendor batch PR.

## Verification checklist

### 1. Source provenance

- [x] Source repo pinned: `OpenGHz/rembg-bg-removal@3e9e829db5921e5754fd82af645f82b7357446ee`
- [x] Source path: `/` (repo root)
- [x] License: MIT (LICENSE file at repo root, "Copyright (c) 2026 Haizhou Ge")
- [x] Attribution: "Copyright (c) 2026 Haizhou Ge" preserved in copied LICENSE

### 2. File integrity

- [x] 5 vendored files (SKILL.md + 1 reference + 2 shell scripts + LICENSE),
      all UTF-8 text
- [x] 0 binaries (file scan: no executable/image/font/archive in vendored set;
      shell scripts are text, not binary)
- [x] Per-file sha256 recorded in `source-lock.json`
- [x] SKILL.md hash: `c6eb1fc3...8d0cb05c`
- [x] models_and_flags.md hash: `531d06b4...1e927acc`
- [x] run_rembg.sh hash: `c822e4e0...c9a46903`
- [x] setup_env.sh hash: `c8a25341...f611eca22`
- [x] LICENSE hash: `ea3939ec...a7a42d76`
- [ ] Hash recompute at batch commit — pending

### 3. Secrets / PII / private locators

- [x] No credentials, tokens, API keys
- [x] No internal hostnames or private locators
- [x] No PII
- [x] Public concepts (rembg models, pip install, U2Net) — acceptable

### 4. Network / execution surface (FAIL-CLOSED)

- [x] Shell scripts vendored as **text reference** — NOT executed, NOT chmod +x,
      NOT invoked by any validator/runtime
- [x] No `npx` in vendored text; scripts reference `pip install` + `rembg` binary
      but are NOT executed in vendor context
- [x] `execution_status: reference-only-no-auto-execution` set
- [x] Not registered in any validator, not auto-loaded
- [x] **Fail-closed homólogo contract**: `execution_boundary: requires_user_confirmation` — homólogo `media-rembg` describes capability in prose and gates execution behind user confirmation. NO auto-execute binary/install/network.

### 5. Toolchain isolation

- [x] `skills/vendor/**` excluded from tsconfig
- [x] Excluded from eslint, prettier, check-privacy
- [x] Not in `skill-registry.yml` (v2) nor `creation-v3-skill-registry.yml` (H-03)
- [x] No `package.json` mutation (vendor reference-only)
- [x] Shell scripts not made executable (text reference only)

### 6. License compliance

- [x] MIT (LICENSE file at source root) — OSI-approved, no source-available risk
- [x] Attribution preserved in copied LICENSE
- [x] Homólogo derivation MIT-compatible (clean-room prose from permissive reference)

### 7. Ledger / baseline

- [x] Vendors post-closure — do NOT shift baseline (387/387)
- [x] No `docs-budget-v2.test.ts` baseline_words/loc shift (vendor excluded)
- [ ] Ledger regen at batch commit — pending (verify 387/387)

## Gates (run once for the full 4-vendor batch)

| gate                     | status  | note                                                                                                       |
| ------------------------ | ------- | ---------------------------------------------------------------------------------------------------------- |
| `check:repo`             | PENDING | vendor dirs excluded; no structural regression expected                                                    |
| `verify:contributions`   | PENDING | vendor files not authored-eligible                                                                         |
| `typecheck`              | PENDING | `skills/vendor/**` excluded from tsconfig                                                                  |
| `lint`                   | PENDING | vendor dirs excluded from eslint                                                                           |
| `test`                   | PENDING | no test surface in vendor dirs                                                                             |
| `format:check`           | PENDING | `skills/vendor/**` in `.prettierignore`; new `docs/rembg-bg-removal/*.md` formatted via `prettier --write` |
| `verify:skills`          | PENDING | vendors bypass; reconcile unaffected                                                                       |
| `ledger:generate`        | PENDING | vendors post-closure; baseline 387/387 unchanged expected                                                  |
| file content-type        | text    | SKILL.md + reference + 2 shell scripts + LICENSE = UTF-8 text; 0 binary leaks                              |
| shell scripts executable | false   | NOT chmod +x; text reference only; not invoked                                                             |

## Known risks

1. **TOOL skill — fail-closed required** — rembg invokes external binary
   (pip install + model download + image processing). Contained as
   reference-only vendor; homólogo `media-rembg` is fail-closed
   (`requires_user_confirmation`). [CONFIG]
2. **Shell scripts vendored as text** — `run_rembg.sh` + `setup_env.sh` are
   shell scripts but vendored as non-executable text reference. No execution in
   vendor context. [DOC]
3. **format:check false-positive** — `.claude/settings.local.json` gitignored;
   known risk #11, not blocking. New `docs/rembg-bg-removal/*.md` formatted via
   `prettier --write`. [DOC]

## Verdict

**PASS (content + license + fail-closed containment).** 5 text files vendored,
MIT verified (LICENSE at source root), 0 binaries, 0 secrets, shell scripts
contained as non-executable text reference, no auto-execution surface.
Fail-closed homólogo contract enforced (`requires_user_confirmation`). Gate
execution pending batch PR commit; hash recompute + gate run will confirm at
commit. Ready for `media-rembg` homólogo (Fase 2P, media-* family, H-03 path,
fail-closed). Producer (lead) ≠ verifier (lead, distinct step) — Guardian gate
pending at PR merge confirmation.
