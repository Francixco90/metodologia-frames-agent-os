# genjutsu vendor verification — Fase 1O

> Verifier: lead (distinct from producer) · Date: 2026-08-04 · 17 skills, MIT.
> Gates run once for the full 4-repo medium batch PR.

## Verification checklist

### 1. Source provenance

- [x] Source repo pinned: `AThevon/genjutsu@08a792f6403104a231fc3f9b1612577698d6e03d`
- [x] Source path: `skills/` (17 skills: 15 in `_jutsu/` + cast + paint)
- [x] License: MIT (LICENSE file at repo root, "Copyright (c) 2026 Adrien Thevon")
- [x] Attribution: "Copyright (c) 2026 Adrien Thevon" preserved in copied LICENSE

### 2. File integrity

- [x] 91 vendored files (90 skill files + LICENSE), all UTF-8 text
- [x] 0 binaries (file scan: no executable/image/font/archive; .py scripts +
      .csv data are text, not binary)
- [x] Per-file sha256 recorded in `source-lock.json`
- [x] 17 skills detected (each with SKILL.md; 15 in `_jutsu/` + cast + paint)
- [ ] Hash recompute at batch commit — pending

### 3. Secrets / PII / private locators

- [x] No credentials, tokens, API keys
- [x] No internal hostnames or private locators
- [x] No PII
- [x] Public design concepts (motion principles, UI/UX guidelines, design
      systems, UI component CSV data) — acceptable

### 4. Network / execution surface

- [x] Python scripts (`_jutsu/ui-ux-pro-max/scripts/*.py`) vendored as **text
      reference** — NOT executed, NOT chmod +x, NOT invoked by any
      validator/runtime
- [x] CSV data (`_jutsu/ui-ux-pro-max/data/*.csv`) — text reference, not loaded
      by any runtime
- [x] No `npx` in vendored text
- [x] `execution_status: reference-only-no-auto-execution` set
- [x] Not registered in any validator, not auto-loaded
- [x] Homólogos (design-*) reproduce guidance as clean-room prose; executable
      capabilities fail-closed (describe in prose, gate behind user confirmation)

### 5. Toolchain isolation

- [x] `skills/vendor/**` excluded from tsconfig
- [x] Excluded from eslint, prettier, check-privacy
- [x] Not in `skill-registry.yml` (v2) nor `creation-v3-skill-registry.yml` (H-03)
- [x] No `package.json` mutation (vendor reference-only)
- [x] Python scripts not made executable (text reference only)

### 6. License compliance

- [x] MIT (LICENSE file at source root) — OSI-approved, no source-available risk
- [x] Attribution preserved in copied LICENSE
- [x] Homólogo derivation MIT-compatible (clean-room prose from permissive reference)

### 7. Ledger / baseline

- [x] Vendors post-closure — do NOT shift baseline (387/387)
- [x] No `docs-budget-v2.test.ts` baseline_words/loc shift (vendor excluded)
- [ ] Ledger regen at batch commit — pending (verify 387/387)

### 8. Duplicate handling verified

- [x] `_jutsu/gsap` sub-skill — distinct homólogo `design-genjutsu-gsap-motion`
      (vs standalone #54 `gsap-skills`); LINEAGE `authority_refs` → genjutsu path
- [x] `_jutsu/ui-ux-pro-max` sub-skill — distinct homólogo `design-genjutsu-uiux`
      (vs standalone #52 `ui-ux-pro-max`); LINEAGE `authority_refs` → genjutsu path
- [x] No identifier conflict across vendor dirs

## Gates (run once for the full 4-repo medium batch)

| gate                      | status  | note                                                                                               |
| ------------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| `check:repo`              | PENDING | vendor dirs excluded; no structural regression expected                                            |
| `verify:contributions`    | PENDING | vendor files not authored-eligible                                                                 |
| `typecheck`               | PENDING | `skills/vendor/**` excluded from tsconfig                                                          |
| `lint`                    | PENDING | vendor dirs excluded from eslint                                                                   |
| `test`                    | PENDING | no test surface in vendor dirs                                                                     |
| `format:check`            | PENDING | `skills/vendor/**` in `.prettierignore`; new `docs/genjutsu/*.md` formatted via `prettier --write` |
| `verify:skills`           | PENDING | vendors bypass; reconcile unaffected                                                               |
| `ledger:generate`         | PENDING | vendors post-closure; baseline 387/387 unchanged expected                                          |
| file content-type         | text    | 90 skill files (md + py + csv) + LICENSE = UTF-8 text; 0 binary leaks                              |
| python scripts executable | false   | NOT chmod +x; text reference only; not invoked                                                     |

## Known risks

1. **Duplicate sub-skills (gsap, ui-ux-pro-max)** — duplicate standalone vendor
   PRs #54 + #52. Handled with distinct homólogo names + LINEAGE mapping to
   genjutsu sub-skill paths. [CONFIG]
2. **Python scripts + CSV data vendored as text** — `_jutsu/ui-ux-pro-max/`
   has scripts/_.py + data/_.csv. Vendored as non-executable text reference. No
   execution in vendor context. [DOC]
3. **format:check false-positive** — `.claude/settings.local.json` gitignored;
   known risk #11, not blocking. [DOC]

## Verdict

**PASS (content + license + script containment + duplicate handling).** 91
text files vendored, MIT verified (LICENSE at source root), 0 binaries, 0
secrets, Python scripts + CSV data contained as non-executable text reference, no
auto-execution surface. Duplicate sub-skills handled with distinct homólogo
names. Gate execution pending batch PR commit; hash recompute + gate run will
confirm at commit. Ready for design-* homólogos (Fase 2F-2H, H-03 path).
Producer (lead) ≠ verifier (lead, distinct step) — Guardian gate pending at PR
merge confirmation.
