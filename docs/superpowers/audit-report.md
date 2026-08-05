# superpowers vendor audit — Fase 1N

> Audit date: 2026-08-04 · Auditor: lead · 14 skills, MIT · Per-file sha256 in
> [`source-lock.json`](./source-lock.json).

## Scope

14 skills vendored text-only into `skills/vendor/superpowers/` as
**reference-only** input for locally-authored dev-* homólogos (expansion Fase
2J-2M, dev-* family, H-03 path). 50 skill files copied (14 SKILL.md + supporting
.ts/.sh/.js/.cjs/.html/.dot scripts) + LICENSE, 0 binaries excluded. Source is
**MIT licensed** (LICENSE at repo root, "Copyright (c) 2025 Jesse Vincent").

## Source resolution

| source repo        | commit     | license | source path | skills vendored |
| ------------------ | ---------- | ------- | ----------- | --------------- |
| `obra/superpowers` | `44c9b2d6` | MIT     | `skills/`   | 14 (50 files)   |

| skill                            | description                | homólogo (Fase 2)                    |
| -------------------------------- | -------------------------- | ------------------------------------ |
| `brainstorming`                  | brainstorming (scripts/)   | `dev-brainstorming`                  |
| `dispatching-parallel-agents`    | parallel agent dispatch    | `dev-dispatching-parallel-agents`    |
| `executing-plans`                | plan execution             | `dev-executing-plans`                |
| `finishing-a-development-branch` | branch finishing           | `dev-finishing-branch`               |
| `receiving-code-review`          | receiving review           | `dev-receiving-code-review`          |
| `requesting-code-review`         | requesting review          | `dev-requesting-code-review`         |
| `subagent-driven-development`    | SDD (scripts/)             | `dev-subagent-driven-development`    |
| `systematic-debugging`           | systematic debug (.ts/.sh) | `dev-systematic-debugging`           |
| `test-driven-development`        | TDD                        | `dev-test-driven-development`        |
| `using-git-worktrees`            | git worktrees              | `dev-using-git-worktrees`            |
| `using-superpowers`              | using superpowers          | `dev-using-superpowers`              |
| `verification-before-completion` | verification               | `dev-verification-before-completion` |
| `writing-plans`                  | writing plans              | `dev-writing-plans`                  |
| `writing-skills`                 | writing skills (.js/.dot)  | `dev-writing-skills`                 |

## License

Source is **MIT** (LICENSE file at repo root, "Copyright (c) 2025 Jesse Vincent").
MIT permits redistribution and modification with attribution. Homólogos derive
under `LicenseRef-MetodologIA-Internal` with `derivation_mode:
clean-room-prose-from-permissive-reference` (MIT-compatible; attribution
preserved in LINEAGE.yml).

## Global audit findings

### 1. License — MIT (LICENSE file at root)

- MIT per LICENSE file at repo root ("Copyright (c) 2025 Jesse Vincent").
- OSI-approved, no source-available risk.

### 2. Binaries excluded

None. All 50 skill files are UTF-8 text: SKILL.md (markdown), .ts (TypeScript
example), .sh (shell scripts — vendored non-executable), .js/.cjs (Node scripts),
.html (frame template), .dot (graphviz). `file` reports no
binary/executable/image/font in the vendored set.

### 3. Secrets / PII / private locators

None. Skill files reference public dev-workflow concepts (TDD, debugging,
worktrees, subagents). No credentials, tokens, internal hostnames, or PII.

### 4. Network / execution surface

**Present but contained.** `brainstorming/scripts/{start,stop}-server.sh` +
`server.cjs` could start a local server; `systematic-debugging/find-polluter.sh`

- `.ts` example could run scripts. Vendored as **reference-only** — shell
  scripts are NOT executed, NOT made executable (chmod -x applied), NOT
  registered, NOT wired into any validator. Homólogos (dev-* family) reproduce the
  guidance as clean-room prose; any executable capability is fail-closed (describe
  in prose, gate behind user confirmation). No `npx` in vendored text.

### 5. Content-type verification

50 skill files (md + ts + sh + js + cjs + html + dot) + LICENSE are UTF-8 text.
0 binary leaks.

## Per-skill checklist (summary)

All 14 skills satisfy: MIT license + attribution preserved, source commit pinned
`44c9b2d6e889982ac18c27d05a19fefe335194e1`, text-only (md + scripts), no
secrets/PII, `execution_status: reference-only-no-auto-execution`, per-file
sha256 in `source-lock.json`. Shell scripts vendored as non-executable text
reference (chmod -x applied).

## Verdict

**PASS.** 14 skills, MIT (LICENSE at root), 51 text files vendored (50 skill
files + LICENSE), 0 binaries, 0 secrets. Shell scripts contained as
non-executable text reference. Ready for dev-* homólogos (Fase 2J-2M, H-03
path).
