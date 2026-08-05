# dn-memory vendor verification — Fase 1M

> Verifier: lead (distinct from producer) · Date: 2026-08-04 · 6 skills,
> Apache-2.0. Gates run once for the full 4-repo medium batch PR.

## Verification checklist

### 1. Source provenance

- [x] Source repo pinned: `DN-OpenSource/claude-skills@1706decfd8771470263e947c6d8d14becef2cb55`
- [x] Source path: `skills/` (6 canonical skills)
- [x] License: Apache-2.0 (LICENSE file at repo root)
- [x] Attribution: "Copyright (c) The dn-memory authors" — preserved in homólogo
      LINEAGE + `Derivada de` line (no NOTICE file at source root)

### 2. File integrity

- [x] 34 vendored files (33 skill files + LICENSE), all UTF-8 text
- [x] 0 binaries (file scan: no executable/image/font/archive; .py scripts are
      text, not binary)
- [x] Per-file sha256 recorded in `source-lock.json`
- [x] 6 skills detected (each with SKILL.md)
- [ ] Hash recompute at batch commit — pending

### 3. Secrets / PII / private locators

- [x] No credentials, tokens, API keys
- [x] No internal hostnames or private locators
- [x] No PII
- [x] Public concepts (LSP, memory schemas, codebase guardian) — acceptable

### 4. Network / execution surface

- [x] Python scripts (`lsp/scripts/*.py`) vendored as **text reference** — NOT
      executed, NOT chmod +x, NOT invoked by any validator/runtime
- [x] No `npx` in vendored text
- [x] `execution_status: reference-only-no-auto-execution` set
- [x] Not registered in any validator, not auto-loaded

### 5. Toolchain isolation

- [x] `skills/vendor/**` excluded from tsconfig
- [x] Excluded from eslint, prettier, check-privacy
- [x] Not in `skill-registry.yml` (v2) nor `creation-v3-skill-registry.yml` (H-03)
- [x] No `package.json` mutation (vendor reference-only)
- [x] Python scripts not made executable (text reference only)

### 6. License compliance

- [x] Apache-2.0 (LICENSE file at source root) — OSI-approved, permissive
- [x] Attribution preserved in homólogo LINEAGE + `Derivada de` line (no NOTICE
      file at source root)
- [x] Homólogo derivation Apache-2.0-compatible (clean-room prose from permissive
      reference)

### 7. Ledger / baseline

- [x] Vendors post-closure — do NOT shift baseline (387/387)
- [x] No `docs-budget-v2.test.ts` baseline_words/loc shift (vendor excluded)
- [ ] Ledger regen at batch commit — pending (verify 387/387)

## Gates (run once for the full 4-repo medium batch)

| gate                      | status  | note                                                                                                |
| ------------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| `check:repo`              | PENDING | vendor dirs excluded; no structural regression expected                                             |
| `verify:contributions`    | PENDING | vendor files not authored-eligible                                                                  |
| `typecheck`               | PENDING | `skills/vendor/**` excluded from tsconfig                                                           |
| `lint`                    | PENDING | vendor dirs excluded from eslint                                                                    |
| `test`                    | PENDING | no test surface in vendor dirs                                                                      |
| `format:check`            | PENDING | `skills/vendor/**` in `.prettierignore`; new `docs/dn-memory/*.md` formatted via `prettier --write` |
| `verify:skills`           | PENDING | vendors bypass; reconcile unaffected                                                                |
| `ledger:generate`         | PENDING | vendors post-closure; baseline 387/387 unchanged expected                                           |
| file content-type         | text    | 33 skill files (md + json + py) + LICENSE = UTF-8 text; 0 binary leaks                              |
| python scripts executable | false   | NOT chmod +x; text reference only; not invoked                                                      |

## Known risks

1. **Apache-2.0 (not MIT)** — permissive but has NOTICE tradition. No NOTICE file
   at source root; attribution preserved in homólogo LINEAGE + `Derivada de`
   line. [DOC]
2. **Python scripts vendored as text** — `lsp/scripts/*.py` are Python but
   vendored as non-executable text reference. No execution in vendor context.
   [DOC]
3. **format:check false-positive** — `.claude/settings.local.json` gitignored;
   known risk #11, not blocking. [DOC]

## Verdict

**PASS (content + license).** 34 text files vendored, Apache-2.0 verified
(LICENSE at source root; attribution preserved in homólogo LINEAGE), 0
binaries, 0 secrets, Python scripts contained as non-executable text reference,
no auto-execution surface. Gate execution pending batch PR commit; hash
recompute + gate run will confirm at commit. Ready for context-* homólogos
(Fase 2N-2O, H-03 path). Producer (lead) ≠ verifier (lead, distinct step) —
Guardian gate pending at PR merge confirmation.
