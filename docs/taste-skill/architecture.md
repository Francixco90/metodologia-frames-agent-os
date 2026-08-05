# taste-skill vendor architecture — Fase 1E

> Reference-only vendor copy. Not executed, not registered, not wired into any
> validator or toolchain. Source: `leonxlnx/taste-skill@e988add`.

## Layout

```
skills/vendor/taste-skill/
├── LICENSE                     # MIT (Copyright (c) 2026 Leonxlnx)
├── llms.txt                    # 13 lines, skill index
├── brandkit/SKILL.md           # 798 lines
├── brutalist-skill/SKILL.md    # 92 lines
├── gpt-tasteskill/SKILL.md     # 74 lines
├── image-to-code-skill/SKILL.md # 1228 lines
├── imagegen-frontend-mobile/SKILL.md # 1465 lines
├── imagegen-frontend-web/SKILL.md # 987 lines
├── minimalist-skill/SKILL.md    # 85 lines
├── output-skill/SKILL.md       # 49 lines
├── redesign-skill/SKILL.md     # 178 lines
├── soft-skill/SKILL.md         # 98 lines
├── stitch-skill/
│   ├── SKILL.md                # 184 lines
│   └── DESIGN.md               # semantic design system doc
├── taste-skill-v1/SKILL.md     # 226 lines
└── taste-skill/SKILL.md        # 1206 lines
```

## Source map

All 13 skills copied from `skills/<folder>/SKILL.md` →
`skills/vendor/taste-skill/<folder>/SKILL.md` (UTF-8 text). stitch-skill also
includes `DESIGN.md`. LICENSE copied from repo root. llms.txt copied from
`skills/llms.txt`.

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

| homólogo family                        | validator                                    | registry                                           | receipt                                   |
| -------------------------------------- | -------------------------------------------- | -------------------------------------------------- | ----------------------------------------- |
| design-* (12)                          | H-03 (`scripts/check-creation-v3-skills.ts`) | `registries/skills/creation-v3-skill-registry.yml` | per-skill `receipts/runtime-boundary.yml` |
| dev-* (1: dev-full-output-enforcement) | H-03                                         | `registries/skills/creation-v3-skill-registry.yml` | per-skill `receipts/runtime-boundary.yml` |

All 13 homólogos (Fase 2B-2E + expansion) reference vendor SKILL.md as
`authority_refs[0]` in LINEAGE.yml. Clean-room prose: no vendor code imported, no
vendor SKILL.md fragment reused verbatim.
