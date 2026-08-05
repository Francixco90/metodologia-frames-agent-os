# superpowers vendor verification — Fase 1N

> Verifier: lead (distinct from producer) · Date: 2026-08-04 · 14 skills, MIT.
> Gates run once for the full 4-repo medium batch PR.

## Verification checklist

### 1. Source provenance

- [x] Source repo pinned: `obra/superpowers@44c9b2d6e889982ac18c27d05a19fefe335194e1`
- [x] Source path: `skills/` (14 canonical skills)
- [x] License: MIT (LICENSE file at repo root, "Copyright (c) 2025 Jesse Vincent")
- [x] Attribution: "Copyright (c) 2025 Jesse Vincent" preserved in copied LICENSE

### 2. File integrity

- [x] 51 vendored files (50 skill files + LICENSE), all UTF-8 text
- [x] 0 binaries (file scan: no executable/image/font/archive; .sh/.ts/.js/.cjs/
      .html/.dot are text)
- [x] Per-file sha256 recorded in `source-lock.json`
- [x] 14 skills detected (each with SKILL.md)
- [ ] Hash recompute at batch commit — pending

### 3. Secrets / PII / private locators

- [x] No credentials, tokens, API keys
- [x] No internal hostnames or private locators
- [x] No PII
- [x] Public dev-workflow concepts (TDD, debugging, worktrees, subagents) —
      acceptable

### 4. Network / execution surface

- [x] Shell scripts (`brainstorming/scripts/*.sh`, `systematic-debugging/find-polluter.sh`) vendored as **text reference** — NOT executed, NOT chmod +x (chmod -x applied), NOT invoked by any validator/runtime
- [x] `brainstorming/scripts/server.cjs` + `helper.js` — text reference, not executed
- [x] No `npx` in vendored text
- [x] `execution_status: reference-only-no-auto-execution` set
- [x] Not registered in any validator, not auto-loaded
- [x] Homólogos (dev-*) reproduce guidance as clean-room prose; executable capabilities fail-closed (describe in prose, gate behind user confirmation)

### 5. Toolchain isolation

- [x] `skills/vendor/**` excluded from tsconfig
- [x] Excluded from eslint, prettier, check-privacy
- [x] Not in `skill-registry.yml` (v2) nor `creation-v3-skill-registry.yml` (H-03)
- [x] No `package.json` mutation (vendor reference-only)
- [x] Shell/JS scripts not made executable (text reference only)

### 6. License compliance

- [x] MIT (LICENSE file at source root) — OSI-approved, no source-available risk
- [x] Attribution preserved in copied LICENSE
- [x] Homólogo derivation MIT-compatible (clean-room prose from permissive reference)

### 7. Ledger / baseline

- [x] Vendors post-closure — do NOT shift baseline (387/387)
- [x] No `docs-budget-v2.test.ts` baseline_words/loc shift (vendor excluded)
- [ ] Ledger regen at batch commit — pending (verify 387/387)

## Gates (run once for the full 4-repo medium batch)

| gate                        | status  | note                                                                                                  |
| --------------------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| `check:repo`                | PENDING | vendor dirs excluded; no structural regression expected                                               |
| `verify:contributions`      | PENDING | vendor files not authored-eligible                                                                    |
| `typecheck`                 | PENDING | `skills/vendor/**` excluded from tsconfig                                                             |
| `lint`                      | PENDING | vendor dirs excluded from eslint                                                                      |
| `test`                      | PENDING | no test surface in vendor dirs                                                                        |
| `format:check`              | PENDING | `skills/vendor/**` in `.prettierignore`; new `docs/superpowers/*.md` formatted via `prettier --write` |
| `verify:skills`             | PENDING | vendors bypass; reconcile unaffected                                                                  |
| `ledger:generate`           | PENDING | vendors post-closure; baseline 387/387 unchanged expected                                             |
| file content-type           | text    | 50 skill files (md + ts + sh + js + cjs + html + dot) + LICENSE = UTF-8 text; 0 binary leaks          |
| shell/js scripts executable | false   | NOT chmod +x (chmod -x applied); text reference only; not invoked                                     |

## Known risks

1. **Scripts with execution surface** — `brainstorming/scripts/server.cjs` +
   `start-server.sh` could start a local server; `find-polluter.sh` could run.
   Contained as reference-only vendor (non-executable); homólogos describe
   capabilities in prose, fail-closed. [CONFIG]
2. **format:check false-positive** — `.claude/settings.local.json` gitignored;
   known risk #11, not blocking. [DOC]

## Verdict

**PASS (content + license + script containment).** 51 text files vendored, MIT
verified (LICENSE at source root), 0 binaries, 0 secrets, shell/JS scripts
contained as non-executable text reference, no auto-execution surface. Gate
execution pending batch PR commit; hash recompute + gate run will confirm at
commit. Ready for dev-* homólogos (Fase 2J-2M, H-03 path). Producer (lead) ≠
verifier (lead, distinct step) — Guardian gate pending at PR merge confirmation.
