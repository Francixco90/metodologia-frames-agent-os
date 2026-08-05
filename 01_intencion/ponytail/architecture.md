# ponytail vendor architecture — Fase 1L

> Vendor root: `skills/vendor/ponytail/` · 6 skills · MIT · Reference-only.

## Layout

```
skills/vendor/ponytail/
├── LICENSE                         (MIT, from source root)
├── ponytail/SKILL.md                (YAGNI "laziest senior dev" core)
├── ponytail-review/SKILL.md         (code review)
├── ponytail-audit/SKILL.md          (audit)
├── ponytail-debt/SKILL.md           (tech debt)
├── ponytail-gain/SKILL.md           (gain/leverage)
└── ponytail-help/SKILL.md           (help)
```

7 files total (6 SKILL.md + 1 LICENSE at vendor root).

## Source map

| source repo               | commit     | license | source path | destination               | files       |
| ------------------------- | ---------- | ------- | ----------- | ------------------------- | ----------- |
| `DietrichGebert/ponytail` | `16f29800` | MIT     | `skills/`   | `skills/vendor/ponytail/` | 6 + LICENSE |

Source commit: `16f29800fd2681bdf24f3eb4ccffe38be3baec6b`. LICENSE at source root
("Copyright (c) 2026 DietrichGebert") — copied to vendor root.

## Toolchain isolation

Vendored skills are **post-closure reference-only** and excluded from the
toolchain:

- **tsconfig.json**: `"exclude": [..., "skills/vendor/**"]` — not typechecked.
- **.prettierignore**: `skills/vendor/**` — not formatted.
- **eslint**: vendor dirs excluded.
- **check-privacy.ts**: `isVendor()` bypass — not privacy-scanned.
- **reconcile-skill-registries.ts**: `if (name === 'vendor') return false` —
  vendor dirs bypass reconcile gate RCN-009.
- **Post-closure no baseline shift**: ledger regen absorbs new vendor files
  without shifting authored-corpus baseline.

## Homólogo wiring

All 6 skills → dev-* family (Fase 2J-2M, H-03 path):

| vendored skill    | MetodologIA homólogo  | validator | registry                         | per-skill runtime-boundary      |
| ----------------- | --------------------- | --------- | -------------------------------- | ------------------------------- |
| `ponytail`        | `dev-ponytail`        | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `ponytail-review` | `dev-ponytail-review` | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `ponytail-audit`  | `dev-ponytail-audit`  | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `ponytail-debt`   | `dev-ponytail-debt`   | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `ponytail-gain`   | `dev-ponytail-gain`   | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `ponytail-help`   | `dev-ponytail-help`   | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |

### Homólogo derivation contract (per skill)

- `content_origin: locally_authored_adaptation`
- `derivation_mode: clean-room-prose-from-permissive-reference`
- `external_fragments_reused: false`
- `license: LicenseRef-MetodologIA-Internal`
- `metadata.model_agnostic: true`
- `publication_authority: false`
- `authority_refs`: `skills/vendor/ponytail/<skill>/SKILL.md` (read-only) +
  `core/contracts/creation-v3.ts` (H-03 contract)
- SKILL.md line: `Derivada de <skill> (DietrichGebert/ponytail, MIT)`

## License guard

- Vendored skills are **MIT** (LICENSE at source root, copied to vendor root).
- Homólogos are **clean-room prose adaptations** (`LicenseRef-MetodologIA-Internal`,
  `derivation_mode: clean-room-prose-from-permissive-reference`,
  `external_fragments_reused: false`). MIT attribution preserved in LINEAGE.yml.
- `check-skill.mjs` self-contained (no import of vendor code) → no viral license
  surface.
- Vendor copy excluded from toolchain → not typechecked, not linted, not in
  `verify:skills`.

Full lock: [`source-lock.json`](./source-lock.json).
