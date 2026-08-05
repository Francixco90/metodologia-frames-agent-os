# karpathy-skills vendor audit — Fase 1H

> Audit date: 2026-08-04 · Auditor: lead · 1 skill, MIT · Per-file sha256 in
> [`source-lock.json`](./source-lock.json).

## Scope

1 skill vendored text-only into `skills/vendor/karpathy-skills/karpathy-guidelines/`
as **reference-only** input for the locally-authored `karpathy-guidelines`
homólogo (expansion Fase 2J, dev-* family, H-03 path). 2 text files copied
(SKILL.md + EXAMPLES.md), 0 binaries excluded. Source is **MIT licensed**
(declared in repo README `## License MIT` + SKILL.md frontmatter `license: MIT`;
**no LICENSE file at source repo root** → LICENSE file created at vendor root from
declaration).

## Source resolution

| skill                 | source repo                           | commit    | license | source path                   | files vendored             |
| --------------------- | ------------------------------------- | --------- | ------- | ----------------------------- | -------------------------- |
| `karpathy-guidelines` | `forrestchang/andrej-karpathy-skills` | `2c60614` | MIT     | `skills/karpathy-guidelines/` | 2 (SKILL.md + EXAMPLES.md) |

- **karpathy-guidelines** (behavioral guidelines): SKILL.md (67 lines) +
  EXAMPLES.md. Prose-only behavioral guidelines to reduce common LLM coding
  mistakes (avoid overcomplication, surgical changes, surface assumptions,
  verifiable success criteria). Derived from Andrej Karpathy's observations. No
  code, no CLI, no network surface.

## License

Source is **MIT** (declared in repo README `## License MIT` + SKILL.md frontmatter
`license: MIT`). **No LICENSE file at source repo root** — a MIT LICENSE file was
created at the vendor root (`skills/vendor/karpathy-skills/LICENSE`) from the
declaration, with forrestchang attribution. MIT permits redistribution and
modification with attribution. Homólogo (`karpathy-guidelines`, Fase 2J) derives
under `LicenseRef-MetodologIA-Internal` with `derivation_mode:
clean-room-prose-from-permissive-reference` (MIT-compatible; attribution preserved
in LINEAGE.yml).

## Global audit findings

### 1. License — MIT (README + frontmatter declared, no root LICENSE file)

- MIT per repo README `## License MIT` + SKILL.md frontmatter `license: MIT`.
- No LICENSE file at source repo root — LICENSE file created at vendor root from
  declaration (standard MIT text + "Copyright (c) 2026 forrestchang" attribution).
- No source-available / NOT-OSI risk. License addendum: note MIT declared in
  README + frontmatter rather than a LICENSE file at root.

### 2. Binaries excluded

None. `skills/karpathy-guidelines/` contains only `SKILL.md` (UTF-8 text, 67
lines). EXAMPLES.md (UTF-8 text) copied as referenced support text. `file`
reports no binary/executable/image/font. The repo root contains README.md,
README.zh.md, CURSOR.md, CLAUDE.md, `.claude-plugin/`, `.cursor/rules/` — **NOT
vendored** (only SKILL.md + EXAMPLES.md copied).

### 3. Secrets / PII / private locators

None. SKILL.md + EXAMPLES.md reference a public URL (Karpathy's X post). No
credentials, tokens, internal hostnames, or PII.

### 4. Network / execution surface

None. karpathy-guidelines is prose-only behavioral guidance. No `npx`, no CLI, no
network fetch, no install. Vendored as **reference-only** — not executed, not
registered, not wired into any validator. Homólogo `karpathy-guidelines` (Fase 2J,
dev-* family) reproduces the guidelines as clean-room prose, fail-closed.

### 5. Content-type verification

SKILL.md + EXAMPLES.md are UTF-8 text (ASCII subset). 0 binary leaks.

## Per-skill checklist

### karpathy-guidelines

- [x] License: MIT (README + frontmatter declared; LICENSE created at vendor root)
- [x] Attribution: "Copyright (c) 2026 forrestchang" in created LICENSE
- [x] Source commit pinned: `2c606141936f1eeef17fa3043a72095b4765b9c2`
- [x] Text-only: 2 files (SKILL.md + EXAMPLES.md), 0 binaries
- [x] No secrets/PII/private locators
- [x] `execution_status: reference-only-no-auto-execution`
- [x] Per-file sha256 in `source-lock.json`:
      `SKILL.md = 6e22cc54cb02a5e98ae42d06d9d7292db0c1b43894831b32879beb0166b2aea7`
- [x] Excluded: README.md, README.zh.md, CURSOR.md, CLAUDE.md, `.claude-plugin/`,
      `.cursor/rules/`

## Verdict

**PASS.** 1 skill, MIT (README + frontmatter declared), 3 text files vendored
(SKILL.md + EXAMPLES.md + created LICENSE), 0 binaries, 0 secrets. Ready for
`karpathy-guidelines` homólogo (Fase 2J, dev-* family, H-03 path).
