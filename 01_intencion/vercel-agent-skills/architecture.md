# vercel-agent-skills vendor architecture — Fase 1D

> Reference-only vendor copy. Not executed, not registered, not wired into any
> validator or toolchain. Source: `vercel-labs/agent-skills@7c180d9`.

## Layout

```
skills/vendor/vercel-agent-skills/
├── LICENSE                            # MIT (created from README declaration, Vercel attribution)
└── web-design-guidelines/
    └── SKILL.md                       # 39 lines, UI review guidance prose
```

## Source map

| vendor path                                                        | source path                                              | type       |
| ------------------------------------------------------------------ | -------------------------------------------------------- | ---------- |
| `skills/vendor/vercel-agent-skills/web-design-guidelines/SKILL.md` | `skills/web-design-guidelines/SKILL.md`                  | UTF-8 text |
| `skills/vendor/vercel-agent-skills/LICENSE`                        | created (MIT standard text from README `## License MIT`) | UTF-8 text |

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

| homólogo                       | validator                                    | registry                                           | receipt                                   |
| ------------------------------ | -------------------------------------------- | -------------------------------------------------- | ----------------------------------------- |
| `design-web-design-guidelines` | H-03 (`scripts/check-creation-v3-skills.ts`) | `registries/skills/creation-v3-skill-registry.yml` | per-skill `receipts/runtime-boundary.yml` |

Homólogo (Fase 2C) references vendor SKILL.md as `authority_refs[0]` in
LINEAGE.yml. Clean-room prose: no vendor code imported, no vendor SKILL.md
fragment reused verbatim.
