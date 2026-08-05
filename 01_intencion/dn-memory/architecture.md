# dn-memory vendor architecture — Fase 1M

> Vendor root: `skills/vendor/dn-memory/` · 6 skills · Apache-2.0 ·
> Reference-only.

## Layout

```
skills/vendor/dn-memory/
├── LICENSE                                    (Apache-2.0, from source root)
├── agents-dox/{SKILL.md, .claude-plugin/plugin.json}
├── codebase-guardian/{SKILL.md, .claude-plugin/plugin.json}
├── lsp/{SKILL.md, .claude-plugin/plugin.json, scripts/*.py}
├── memory/{SKILL.md, .claude-plugin/plugin.json}
├── schema-aware-db/{SKILL.md, .claude-plugin/plugin.json}
└── teammates/{SKILL.md, .claude-plugin/plugin.json}
```

34 files total (33 skill files + 1 LICENSE at vendor root). File types: .md
(SKILL.md), .json (plugin.json), .py (lsp scripts).

## Source map

| source repo                   | commit     | license    | source path | destination                | files        |
| ----------------------------- | ---------- | ---------- | ----------- | -------------------------- | ------------ |
| `DN-OpenSource/claude-skills` | `1706decf` | Apache-2.0 | `skills/`   | `skills/vendor/dn-memory/` | 33 + LICENSE |

Source commit: `1706decfd8771470263e947c6d8d14becef2cb55`. LICENSE at source root
(Apache-2.0) — copied to vendor root.

## Toolchain isolation

Vendored skills are **post-closure reference-only** and excluded from the
toolchain:

- **tsconfig.json**: `"exclude": [..., "skills/vendor/**"]` — not typechecked
  (Python files not in TS scope regardless).
- **.prettierignore**: `skills/vendor/**` — not formatted.
- **eslint**: vendor dirs excluded (JS/TS only; .py not linted by eslint).
- **check-privacy.ts**: `isVendor()` bypass — not privacy-scanned.
- **reconcile-skill-registries.ts**: `if (name === 'vendor') return false` —
  vendor dirs bypass reconcile gate RCN-009.
- **Python scripts NOT executable**: vendored as text reference; no `chmod +x`,
  not invoked by any validator or runtime.
- **Post-closure no baseline shift**: ledger regen absorbs new vendor files
  without shifting authored-corpus baseline.

## Homólogo wiring

All 6 skills → context-* family (Fase 2N-2O, H-03 path):

| vendored skill      | MetodologIA homólogo        | validator | registry                         | per-skill runtime-boundary      |
| ------------------- | --------------------------- | --------- | -------------------------------- | ------------------------------- |
| `agents-dox`        | `context-agents-dox`        | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `codebase-guardian` | `context-codebase-guardian` | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `lsp`               | `context-lsp`               | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `memory`            | `context-memory`            | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `schema-aware-db`   | `context-schema-aware-db`   | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `teammates`         | `context-teammates`         | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |

### Homólogo derivation contract (per skill)

- `content_origin: locally_authored_adaptation`
- `derivation_mode: clean-room-prose-from-permissive-reference`
- `external_fragments_reused: false`
- `license: LicenseRef-MetodologIA-Internal`
- `metadata.model_agnostic: true`
- `publication_authority: false`
- `authority_refs`: `skills/vendor/dn-memory/<skill>/SKILL.md` (read-only) +
  `core/contracts/creation-v3.ts` (H-03 contract)
- SKILL.md line: `Derivada de <skill> (DN-OpenSource/claude-skills, Apache-2.0)`

## License guard

- Vendored skills are **Apache-2.0** (LICENSE at source root, copied to vendor
  root). Apache-2.0 permits redistribution + modification with attribution.
- No NOTICE file at source root — attribution preserved in homólogo LINEAGE +
  `Derivada de` line.
- Homólogos are **clean-room prose adaptations**
  (`LicenseRef-MetodologIA-Internal`, `derivation_mode:
clean-room-prose-from-permissive-reference`, `external_fragments_reused:
false`). Apache-2.0 attribution preserved in LINEAGE.yml.
- `check-skill.mjs` self-contained (no import of vendor code) → no viral license
  surface.
- Vendor copy (incl. Python scripts) excluded from toolchain → not typechecked,
  not linted, not executed, not in `verify:skills`.

Full lock: [`source-lock.json`](./source-lock.json).
