# karpathy-skills vendor architecture — Fase 1H

> Reference for Design-OS Fase 2D. Maps the vendored karpathy-guidelines
> skill (`skills/vendor/karpathy-skills/karpathy-guidelines/`) onto the
> MetodologIA `karpathy-guidelines` homólogo. MIT-licensed reference;
> homólogo is a locally-authored clean-room adaptation.

## Layout

```
skills/vendor/karpathy-skills/
├── LICENSE                          (created from MIT declaration — forrestchang)
└── karpathy-guidelines/
    ├── SKILL.md                     (67 lines, behavioral guidelines)
    └── EXAMPLES.md                  (522 lines, worked examples)
```

3 files total (2 in skill dir + 1 LICENSE at vendor root).

## Source map

| vendored skill        | source repo                           | commit    | license | source path                   | destination                                          | files       |
| --------------------- | ------------------------------------- | --------- | ------- | ----------------------------- | ---------------------------------------------------- | ----------- |
| `karpathy-guidelines` | `forrestchang/andrej-karpathy-skills` | `2c60614` | MIT     | `skills/karpathy-guidelines/` | `skills/vendor/karpathy-skills/karpathy-guidelines/` | 2 + LICENSE |

Source commit: `2c606141936f1eeef17fa3043a72095b4765b9c2`. MIT declared in
README + SKILL.md frontmatter; no LICENSE file at source root — created at
vendor root from declaration.

## Toolchain isolation

Vendored skill is **post-closure reference-only** and excluded from the
toolchain:

- **tsconfig.json** line 23: `"exclude": [..., "skills/vendor/**"]` — not
  typechecked.
- **.prettierignore** line 30: `skills/vendor/**` — not formatted.
- **eslint**: vendor dirs excluded.
- **check-privacy.ts** line 40: `isVendor()` bypass — not privacy-scanned.
- **reconcile-skill-registries.ts** line 139:
  `if (name === 'vendor') return false` — vendor dirs bypass reconcile gate
  RCN-009.
- **Post-closure no baseline shift**: ledger regen absorbs new vendor files
  without shifting authored-corpus baseline (vendors are not
  authored-eligible; not in baseline tree).

## Homólogo wiring

| vendored skill        | MetodologIA homólogo  | validator | registry                                           | per-skill runtime-boundary      |
| --------------------- | --------------------- | --------- | -------------------------------------------------- | ------------------------------- |
| `karpathy-guidelines` | `karpathy-guidelines` | H-03      | `registries/skills/creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |

### Homólogo derivation contract

- `content_origin: locally_authored_adaptation`
- `derivation_mode: clean-room-prose-from-permissive-reference`
- `external_fragments_reused: false`
- `license: LicenseRef-MetodologIA-Internal`
- `metadata.model_agnostic: true`
- `publication_authority: false`
- `authority_refs`:
  - `skills/vendor/karpathy-skills/karpathy-guidelines/SKILL.md`
    (read-only reference)
  - `core/contracts/creation-v3.ts` (H-03 contract)
- SKILL.md line: `Derivada de karpathy-guidelines
(forrestchang/andrej-karpathy-skills, MIT)`

### What the homólogo preserves vs. adapts

**Preserves (clean-room prose):**

- Behavioral-guidelines intent: reduce common LLM coding mistakes.
- Core principles: think before coding, surgical changes, surface
  assumptions, verifiable success criteria, avoid overcomplication.
- Dev workflow framing (NOT design) — routes to dev-\* family.

**Adapts (MetodologIA context):**

- Attribution: `Derivada de karpathy-guidelines
(forrestchang/andrej-karpathy-skills, MIT)`.
- Registry: H-03 per-skill runtime-boundary (not v2 shared receipt).
- `check-skill.mjs` self-contained (no import of vendor code; scans tokens;
  forbids `Math.random`/`Date.now`).

## License guard

- Vendored skill is **MIT** (verified via README + frontmatter). MIT permits
  redistribution + modification with attribution. LICENSE created at vendor
  root from declaration (no source-root LICENSE file).
- Homólogo is a **clean-room prose adaptation**
  (`LicenseRef-MetodologIA-Internal`, `derivation_mode:
clean-room-prose-from-permissive-reference`, `external_fragments_reused:
false`). MIT attribution preserved in LINEAGE.yml.
- `check-skill.mjs` self-contained (no import of vendor code) → no viral
  license surface.
- Vendor copy excluded from toolchain (`skills/vendor/**` in tsconfig,
  prettierignore, eslint, check-privacy) → not typechecked, not linted, not
  in `verify:skills`.
