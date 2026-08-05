# design-dna vendor architecture — Fase 1I

> Vendor root: `skills/vendor/design-dna/` · 1 skill · MIT · Reference-only.

## Layout

```
skills/vendor/design-dna/
├── LICENSE                              (MIT, from source root)
└── design-dna/
    ├── SKILL.md                         (design-token / brand-DNA generation)
    └── references/
        ├── generation-guide.md          (support text)
        └── schema.md                     (support text, token schema)
```

4 files total (3 in skill dir + 1 LICENSE at vendor root).

## Source map

| vendored skill | source repo         | commit    | license | source path | destination                            | files       |
| -------------- | ------------------- | --------- | ------- | ----------- | -------------------------------------- | ----------- |
| `design-dna`   | `zanwei/design-dna` | `9d9d795` | MIT     | `/` (root)  | `skills/vendor/design-dna/design-dna/` | 3 + LICENSE |

Source commit: `9d9d79568df31cd846681f89fd3be1c3ce0c2aff`. SKILL.md located at
repo root (not in a `skills/` folder). LICENSE file present at source repo root
("Copyright (c) 2026 the design-dna authors") — copied to vendor root.

## Toolchain isolation

Vendored skill is **post-closure reference-only** and excluded from the
toolchain:

- **tsconfig.json** line 23: `"exclude": [..., "skills/vendor/**"]` — not typechecked.
- **.prettierignore** line 30: `skills/vendor/**` — not formatted.
- **eslint**: vendor dirs excluded.
- **check-privacy.ts** line 40: `isVendor()` bypass — not privacy-scanned.
- **reconcile-skill-registries.ts** line 139: `if (name === 'vendor') return false`
  — vendor dirs bypass reconcile gate RCN-009.
- **Post-closure no baseline shift**: ledger regen absorbs new vendor files
  without shifting authored-corpus baseline (vendors not authored-eligible).

## Homólogo wiring

| vendored skill | MetodologIA homólogo | validator | registry                                           | per-skill runtime-boundary      |
| -------------- | -------------------- | --------- | -------------------------------------------------- | ------------------------------- |
| `design-dna`   | `design-dna`         | H-03      | `registries/skills/creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |

### Homólogo derivation contract

- `content_origin: locally_authored_adaptation`
- `derivation_mode: clean-room-prose-from-permissive-reference`
- `external_fragments_reused: false`
- `license: LicenseRef-MetodologIA-Internal`
- `metadata.model_agnostic: true`
- `publication_authority: false`
- `authority_refs`:
  - `skills/vendor/design-dna/design-dna/SKILL.md` (read-only reference)
  - `core/contracts/creation-v3.ts` (H-03 contract)
- SKILL.md line: `Derivada de design-dna (zanwei/design-dna, MIT)`

### What the homólogo preserves vs. adapts

**Preserves (clean-room prose):**

- Design-token / brand-DNA generation intent: produce brand-consistent tokens
  from natural-language brand descriptions.
- Schema-driven token structure (references/schema.md).
- Generation workflow (references/generation-guide.md).

**Adapts (MetodologIA context):**

- Attribution: `Derivada de design-dna (zanwei/design-dna, MIT)`.
- Registry: H-03 per-skill runtime-boundary (not v2 shared receipt).
- `check-skill.mjs` self-contained (no import of vendor code; scans tokens;
  forbids `Math.random`/`Date.now`).

## License guard

- Vendored skill is **MIT** (LICENSE at source root, copied to vendor root). MIT
  permits redistribution + modification with attribution.
- Homólogo is a **clean-room prose adaptation** (`LicenseRef-MetodologIA-Internal`,
  `derivation_mode: clean-room-prose-from-permissive-reference`,
  `external_fragments_reused: false`). MIT attribution preserved in LINEAGE.yml.
- `check-skill.mjs` self-contained (no import of vendor code) → no viral license
  surface.
- Vendor copy excluded from toolchain (`skills/vendor/**` in tsconfig,
  prettierignore, eslint, check-privacy) → not typechecked, not linted, not in
  `verify:skills`.

## Per-file hashes

| file                                        | sha256                                                             |
| ------------------------------------------- | ------------------------------------------------------------------ |
| `design-dna/SKILL.md`                       | `c04472d2cced644f48485f630cb48e2f496624c65b9f0e5f28aec9af153c7fbf` |
| `design-dna/references/generation-guide.md` | `7073c2b297854daa49c2f2474a678a438fa65db59a2cf07bd71ca373174b4ef8` |
| `design-dna/references/schema.md`           | `7437729591e892ccd6c373beb316c28025c05bb78633cbe4912ee40523a03dcf` |
| `LICENSE`                                   | `2de108bcd0d904f8756e1135ca77ce1e3e9ca0edb1ae6abecb97dea76d27d174` |

Full lock: [`source-lock.json`](./source-lock.json).
