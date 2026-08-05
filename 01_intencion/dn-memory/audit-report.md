# dn-memory vendor audit — Fase 1M

> Audit date: 2026-08-04 · Auditor: lead · 6 skills, Apache-2.0 · Per-file
> sha256 in [`source-lock.json`](./source-lock.json).

## Scope

6 skills vendored text-only into `skills/vendor/dn-memory/` as **reference-only**
input for locally-authored context-* homólogos (expansion Fase 2N-2O, context-*
family, H-03 path). 33 skill files copied (6 SKILL.md + supporting .py scripts +
.claude-plugin/plugin.json) + LICENSE, 0 binaries excluded. Source is
**Apache-2.0 licensed** (LICENSE at repo root).

## Source resolution

| source repo                   | commit     | license    | source path | skills vendored |
| ----------------------------- | ---------- | ---------- | ----------- | --------------- |
| `DN-OpenSource/claude-skills` | `1706decf` | Apache-2.0 | `skills/`   | 6 (33 files)    |

| skill               | description                    | homólogo (Fase 2)           |
| ------------------- | ------------------------------ | --------------------------- |
| `agents-dox`        | agent docs                     | `context-agents-dox`        |
| `codebase-guardian` | codebase guardian              | `context-codebase-guardian` |
| `lsp`               | LSP integration (scripts/*.py) | `context-lsp`               |
| `memory`            | memory                         | `context-memory`            |
| `schema-aware-db`   | schema-aware DB                | `context-schema-aware-db`   |
| `teammates`         | teammates                      | `context-teammates`         |

## License

Source is **Apache-2.0** (LICENSE file at repo root, "Copyright (c) The
dn-memory authors"). Apache-2.0 is OSI-approved permissive; permits
redistribution and modification with attribution + NOTICE. Homólogos derive
under `LicenseRef-MetodologIA-Internal` with `derivation_mode:
clean-room-prose-from-permissive-reference` (Apache-2.0-compatible; attribution
preserved in LINEAGE.yml). No NOTICE file at source root — attribution preserved
in homólogo LINEAGE + `Derivada de` line.

## Global audit findings

### 1. License — Apache-2.0 (LICENSE file at root)

- Apache-2.0 per LICENSE file at repo root.
- OSI-approved, permissive. No source-available / NOT-OSI risk.
- No NOTICE file at source root — attribution preserved in homólogo docs.

### 2. Binaries excluded

None. All 33 skill files are UTF-8 text: SKILL.md (markdown), `.claude-plugin/
plugin.json` (JSON), `lsp/scripts/*.py` (Python). `file` reports no
binary/executable/image/font in the vendored set.

### 3. Secrets / PII / private locators

None. Skill files reference public concepts (LSP, memory schemas, codebase
guardian). No credentials, tokens, internal hostnames, or PII.

### 4. Network / execution surface

**Present but contained.** `lsp/scripts/*.py` are Python scripts that could invoke
an LSP server / subprocess. Vendored as **reference-only** — Python scripts are
NOT executed, NOT made executable, NOT registered, NOT wired into any validator.
Homólogos (context-* family) reproduce the capability as clean-room prose.
`lsp/scripts/test_lsp.py` + `fake_lsp_server.py` are test helpers (text
reference). No `npx` in vendored text.

### 5. Content-type verification

33 skill files (md + json + py) + LICENSE are UTF-8 text. 0 binary leaks.

## Per-skill checklist (summary)

All 6 skills satisfy: Apache-2.0 license + attribution preserved, source commit
pinned `1706decfd8771470263e947c6d8d14becef2cb55`, text-only (md + json + py),
no secrets/PII, `execution_status: reference-only-no-auto-execution`, per-file
sha256 in `source-lock.json`. Python scripts vendored as non-executable text
reference.

## Verdict

**PASS.** 6 skills, Apache-2.0 (LICENSE at root), 34 text files vendored (33
skill files + LICENSE), 0 binaries, 0 secrets. Python scripts contained as
non-executable text reference. Ready for context-* homólogos (Fase 2N-2O, H-03
path).
