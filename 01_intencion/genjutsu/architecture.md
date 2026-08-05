# genjutsu vendor architecture — Fase 1O

> Vendor root: `skills/vendor/genjutsu/` · 17 skills · MIT · Reference-only.

## Layout

```
skills/vendor/genjutsu/
├── LICENSE                                    (MIT, from source root)
├── _jutsu/
│   ├── canvas-generative/{SKILL.md, ...}
│   ├── compose-graphics/{SKILL.md, ...}
│   ├── compose-motion/{SKILL.md, ...}
│   ├── compose-multiplatform/{SKILL.md, ...}
│   ├── css-native/{SKILL.md, ...}
│   ├── design-audit/{SKILL.md, ...}
│   ├── desktop-principles/{SKILL.md, ...}
│   ├── framer-motion/{SKILL.md, ...}
│   ├── gsap/{SKILL.md, ...}
│   ├── mobile-principles/{SKILL.md, ...}
│   ├── motion-principles/{SKILL.md, ...}
│   ├── swiftui-graphics/{SKILL.md, ...}
│   ├── swiftui-motion/{SKILL.md, ...}
│   ├── threejs-r3f/{SKILL.md, ...}
│   └── ui-ux-pro-max/{SKILL.md, scripts/*.py, data/*.csv, data/stacks/*.csv}
├── cast/{SKILL.md, ...}
└── paint/{SKILL.md, ...}
```

91 files total (90 skill files + 1 LICENSE at vendor root). File types: .md, .py,
.csv. The `_jutsu/` dir groups 15 sub-skills; `cast/` + `paint/` are top-level
skills.

## Source map

| source repo        | commit     | license | source path | destination               | files        |
| ------------------ | ---------- | ------- | ----------- | ------------------------- | ------------ |
| `AThevon/genjutsu` | `08a792f6` | MIT     | `skills/`   | `skills/vendor/genjutsu/` | 90 + LICENSE |

Source commit: `08a792f6403104a231fc3f9b1612577698d6e03d`. LICENSE at source root
("Copyright (c) 2026 Adrien Thevon") — copied to vendor root. The `_jutsu/`
sub-skill structure preserved (each sub-skill is a separate vendor entry in
`source-lock.json` with its own `source_path: skills/_jutsu/<sub>/`).

## Toolchain isolation

Vendored skills are **post-closure reference-only** and excluded from the
toolchain:

- **tsconfig.json**: `"exclude": [..., "skills/vendor/**"]` — not typechecked
  (Python files not in TS scope regardless).
- **.prettierignore**: `skills/vendor/**` — not formatted.
- **eslint**: vendor dirs excluded.
- **check-privacy.ts**: `isVendor()` bypass — not privacy-scanned.
- **reconcile-skill-registries.ts**: `if (name === 'vendor') return false` —
  vendor dirs bypass reconcile gate RCN-009.
- **Python scripts NOT executable**: vendored as text reference; no `chmod +x`,
  not invoked by any validator or runtime.
- **Post-closure no baseline shift**: ledger regen absorbs new vendor files
  without shifting authored-corpus baseline.

## Homólogo wiring

All 17 skills → design-* family (Fase 2F-2H, H-03 path):

| vendored skill (source path)   | MetodologIA homólogo                              | validator | registry                         | per-skill runtime-boundary      |
| ------------------------------ | ------------------------------------------------- | --------- | -------------------------------- | ------------------------------- |
| `_jutsu/canvas-generative`     | `design-canvas-generative`                        | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `_jutsu/compose-graphics`      | `design-compose-graphics`                         | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `_jutsu/compose-motion`        | `design-compose-motion`                           | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `_jutsu/compose-multiplatform` | `design-compose-multiplatform`                    | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `_jutsu/css-native`            | `design-css-native`                               | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `_jutsu/design-audit`          | `design-audit-genjutsu`                           | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `_jutsu/desktop-principles`    | `design-desktop-principles`                       | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `_jutsu/framer-motion`         | `design-framer-motion`                            | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `_jutsu/gsap`                  | `design-genjutsu-gsap-motion` (distinct from #54) | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `_jutsu/mobile-principles`     | `design-mobile-principles`                        | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `_jutsu/motion-principles`     | `design-motion-principles`                        | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `_jutsu/swiftui-graphics`      | `design-swiftui-graphics`                         | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `_jutsu/swiftui-motion`        | `design-swiftui-motion`                           | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `_jutsu/threejs-r3f`           | `design-threejs-r3f`                              | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `_jutsu/ui-ux-pro-max`         | `design-genjutsu-uiux` (distinct from #52)        | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `cast`                         | `design-cast`                                     | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |
| `paint`                        | `design-paint`                                    | H-03      | `creation-v3-skill-registry.yml` | `receipts/runtime-boundary.yml` |

### Homólogo derivation contract (per skill)

- `content_origin: locally_authored_adaptation`
- `derivation_mode: clean-room-prose-from-permissive-reference`
- `external_fragments_reused: false`
- `license: LicenseRef-MetodologIA-Internal`
- `metadata.model_agnostic: true`
- `publication_authority: false`
- `authority_refs`: `skills/vendor/genjutsu/<path>/<skill>/SKILL.md` (read-only)
  - `core/contracts/creation-v3.ts` (H-03 contract)
- SKILL.md line: `Derivada de <skill> (AThevon/genjutsu, MIT)`

### Duplicate handling

`_jutsu/gsap` + `_jutsu/ui-ux-pro-max` sub-skills duplicate standalone vendor PRs
#54 (gsap-skills) and #52 (ui-ux-pro-max). Homólogos get distinct names
(`design-genjutsu-gsap-motion`, `design-genjutsu-uiux`); LINEAGE maps
`authority_refs` to the genjutsu sub-skill path
(`skills/vendor/genjutsu/_jutsu/<sub>/SKILL.md`), NOT the standalone vendor.
No identifier conflict.

## License guard

- Vendored skills are **MIT** (LICENSE at source root, copied to vendor root).
- Homólogos are **clean-room prose adaptations** (`LicenseRef-MetodologIA-Internal`,
  `derivation_mode: clean-room-prose-from-permissive-reference`,
  `external_fragments_reused: false`). MIT attribution preserved in LINEAGE.yml.
- `check-skill.mjs` self-contained (no import of vendor code) → no viral license
  surface.
- Vendor copy (incl. Python scripts + CSV data) excluded from toolchain → not
  typechecked, not linted, not executed, not in `verify:skills`.

Full lock: [`source-lock.json`](./source-lock.json).
