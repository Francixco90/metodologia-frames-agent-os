# anthropics-skills vendor architecture — Fase 1D

> Reference-only vendor copy. Not executed, not registered, not wired into any
> validator or toolchain. Source: `anthropics/skills@b29e7cf`.

## Layout

```
skills/vendor/anthropics-skills/
├── LICENSE                      # Apache-2.0 (copy of frontend-design/LICENSE.txt)
└── frontend-design/
    ├── SKILL.md                 # 55 lines, design-lead guidance prose
    └── LICENSE.txt              # Apache-2.0 original
```

## Source map

| vendor path                                                   | source path                          | type       |
| ------------------------------------------------------------- | ------------------------------------ | ---------- |
| `skills/vendor/anthropics-skills/frontend-design/SKILL.md`    | `skills/frontend-design/SKILL.md`    | UTF-8 text |
| `skills/vendor/anthropics-skills/frontend-design/LICENSE.txt` | `skills/frontend-design/LICENSE.txt` | UTF-8 text |
| `skills/vendor/anthropics-skills/LICENSE`                     | copy of `LICENSE.txt`                | UTF-8 text |

## Toolchain isolation

`skills/vendor/**` excluded from:

- TypeScript toolchain (`tsconfig` exclude `skills/vendor/**`)
- ESLint (`eslint` ignore `skills/vendor/**`)
- Prettier (`.prettierignore` `skills/vendor/**`)
- Privacy check (`check-privacy` skips `skills/vendor/**`)
- `verify:skills` validators (v2 + H-03 only scan registered skills; vendors not
  in registries)

Vendor bypasses all gates via `if (name === 'vendor') return false` in
`reconcile-skill-registries.ts` (line 140). Vendors are post-closure
reference-only; they do NOT shift the file-disposition-ledger baseline (not in
the baseline tree, not authored-eligible in closure).

## Homólogo wiring

| homólogo                 | validator                                    | registry                                           | receipt                                   |
| ------------------------ | -------------------------------------------- | -------------------------------------------------- | ----------------------------------------- |
| `design-frontend-design` | H-03 (`scripts/check-creation-v3-skills.ts`) | `registries/skills/creation-v3-skill-registry.yml` | per-skill `receipts/runtime-boundary.yml` |

Homólogo (Fase 2B) references vendor SKILL.md as `authority_refs[0]` in
LINEAGE.yml. Clean-room prose: no vendor code imported, no vendor SKILL.md
fragment reused verbatim.
