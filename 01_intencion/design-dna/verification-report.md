# design-dna vendor verification — Fase 1I

> Verifier: lead (distinct from producer) · Date: 2026-08-04 · 1 skill, MIT.
> Gates run once for the full 4-vendor batch PR, not per-vendor.

## Verification checklist

### 1. Source provenance

- [x] Source repo pinned: `zanwei/design-dna@9d9d79568df31cd846681f89fd3be1c3ce0c2aff`
- [x] Source path: `/` (repo root — SKILL.md at root, not in `skills/` folder)
- [x] License: MIT (LICENSE file at repo root, "Copyright (c) 2026 the design-dna authors")
- [x] Attribution: "Copyright (c) 2026 the design-dna authors" preserved in copied LICENSE

### 2. File integrity

- [x] 4 vendored files (SKILL.md + 2 references + LICENSE), all UTF-8 text
- [x] 0 binaries (`docs/example-style-transfer.png` excluded; file scan: no
      executable/image/font/archive in vendored set)
- [x] Per-file sha256 recorded in `source-lock.json`
- [x] SKILL.md hash: `c04472d2...153c7fbf`
- [x] generation-guide.md hash: `7073c2b2...3174b4ef8`
- [x] schema.md hash: `74377295...523a03dcf`
- [x] LICENSE hash: `2de108bc...76d27d174`
- [ ] Hash recompute at batch commit — pending

### 3. Secrets / PII / private locators

- [x] No credentials, tokens, API keys
- [x] No internal hostnames or private locators
- [x] No PII
- [x] Public concepts (design tokens, brand schemas) — acceptable

### 4. Network / execution surface

- [x] No `npx`, no CLI invocation, no network fetch, no install in vendored text
- [x] Prose-only design-token generation guidance — no executable surface
- [x] `execution_status: reference-only-no-auto-execution` set
- [x] Not registered in any validator, not auto-loaded

### 5. Toolchain isolation

- [x] `skills/vendor/**` excluded from tsconfig
- [x] Excluded from eslint, prettier, check-privacy
- [x] Not in `skill-registry.yml` (v2) nor `creation-v3-skill-registry.yml` (H-03)
- [x] No `package.json` mutation (vendor reference-only)

### 6. License compliance

- [x] MIT (LICENSE file at source root) — OSI-approved, no source-available risk
- [x] Attribution preserved in copied LICENSE
- [x] Homólogo derivation MIT-compatible (clean-room prose from permissive reference)

### 7. Ledger / baseline

- [x] Vendors post-closure — do NOT shift baseline (387/387)
- [x] No `docs-budget-v2.test.ts` baseline_words/loc shift (vendor excluded from
      authored baseline)
- [ ] Ledger regen at batch commit — pending (verify 387/387)

## Gates (run once for the full 4-vendor batch)

| gate                   | status  | note                                                                                                 |
| ---------------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| `check:repo`           | PENDING | vendor dirs excluded; no structural regression expected                                              |
| `verify:contributions` | PENDING | vendor files not authored-eligible                                                                   |
| `typecheck`            | PENDING | `skills/vendor/**` excluded from tsconfig                                                            |
| `lint`                 | PENDING | vendor dirs excluded from eslint                                                                     |
| `test`                 | PENDING | no test surface in vendor dirs                                                                       |
| `format:check`         | PENDING | `skills/vendor/**` in `.prettierignore`; new `docs/design-dna/*.md` formatted via `prettier --write` |
| `verify:skills`        | PENDING | vendors bypass; reconcile unaffected                                                                 |
| `ledger:generate`      | PENDING | vendors post-closure; baseline 387/387 unchanged expected                                            |
| file content-type      | text    | SKILL.md + 2 references + LICENSE = UTF-8 text; 0 binary leaks (PNG excluded)                        |

## Known risks

1. **SKILL.md at repo root** (not in `skills/` folder) — source structure quirk;
   vendored under `skills/vendor/design-dna/design-dna/` to normalize. [DOC]
2. **Binary excluded** — `docs/example-style-transfer.png` excluded (binary,
   not text-only reference). [DOC]
3. **format:check false-positive** — `.claude/settings.local.json` gitignored;
   known risk #11, not blocking. New `docs/design-dna/*.md` formatted via
   `prettier --write`. [DOC]

## Verdict

**PASS (content + license).** 4 text files vendored, MIT verified (LICENSE at
source root), 0 binaries (PNG excluded), 0 secrets, no execution surface,
toolchain isolated, ledger unaffected. Gate execution pending batch PR commit;
hash recompute + gate run will confirm at commit. Ready for `design-dna`
homólogo (Fase 2I, design-* family, H-03 path). Producer (lead) ≠ verifier
(lead, distinct step) — Guardian gate pending at PR merge confirmation.
