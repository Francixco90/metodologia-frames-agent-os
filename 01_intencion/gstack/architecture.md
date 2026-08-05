# gstack vendor architecture — Fase 1P

> Vendor root: `skills/vendor/gstack/` · 59 skills · MIT · Reference-only.

## Layout

```
skills/vendor/gstack/
├── LICENSE                                 (MIT, from source root)
├── SKILL.md                                (gstack router skill, root-level)
├── <skill>/                                (54 root-level skill dirs)
│   ├── SKILL.md
│   └── ... (supporting .ts/.sh/.tmpl/.html/.json/.swift/.sql/.rb/.css/.yml files)
├── browser-skills/
│   └── hackernews-frontpage/{SKILL.md, ...}
└── openclaw/skills/
    ├── gstack-openclaw-ceo-review/{SKILL.md, ...}
    ├── gstack-openclaw-investigate/{SKILL.md, ...}
    ├── gstack-openclaw-office-hours/{SKILL.md, ...}
    └── gstack-openclaw-retro/{SKILL.md, ...}
```

469 files total (468 skill files + 1 LICENSE at vendor root). gstack is **flat**:
no `skills/` prefix — skills live at root level. Router skill = root `SKILL.md`
(1 file). 58 sub-skills in their own dirs. File types: .md, .ts, .sh, .tmpl,
.json, .html, .swift, .sql, .rb, .css, .yml, .js, .cjs, .py, .h, .m, .toml,
.plist, .txt, .lock, .example, .ci.

## Source map

| source repo       | commit    | license | source path      | destination             | files         |
| ----------------- | --------- | ------- | ---------------- | ----------------------- | ------------- |
| `garrytan/gstack` | `a325940` | MIT     | repo root (flat) | `skills/vendor/gstack/` | 468 + LICENSE |

Source commit: `a3259400a366593e0c909dd9ac3e59752efd2488`. LICENSE at source root
("Copyright (c) 2026 Garry Tan") — copied to vendor root. Non-skill infrastructure
dirs excluded (extension/, docs/images/, scripts/app/, test/fixtures/, agents/,
bin/, claude/, connect-chrome/, contrib/, design/, gstack/, hosts/, lib/,
model-overlays/, supabase/).

## Toolchain isolation

Vendored skills are **post-closure reference-only** and excluded from the
toolchain:

- **tsconfig.json**: `"exclude": [..., "skills/vendor/**"]` — not typechecked
  (.ts files not compiled; .js/.cjs not in TS scope).
- **.prettierignore**: `skills/vendor/**` — not formatted.
- **eslint**: vendor dirs excluded.
- **check-privacy.ts**: `isVendor()` bypass — not privacy-scanned.
- **reconcile-skill-registries.ts**: `if (name === 'vendor') return false` —
  vendor dirs bypass reconcile gate RCN-009.
- **Scripts NOT executable**: vendored as text reference; `chmod -x` applied to
  .sh/.js/.ts/.cjs/.rb/.swift/.m/.h/.py files; not invoked by any validator or
  runtime.
- **Post-closure no baseline shift**: ledger regen absorbs new vendor files
  without shifting authored-corpus baseline.

## Homólogo wiring

All 59 skills → mixed families (Fase 2J-2T, H-03 path):

| vendored skill                                 | MetodologIA homólogo           | family    | validator | per-skill runtime-boundary      |
| ---------------------------------------------- | ------------------------------ | --------- | --------- | ------------------------------- |
| `.` (router)                                   | `gstack-router`                | gstack-*  | H-03      | `receipts/runtime-boundary.yml` |
| `autoplan`                                     | `gstack-autoplan`              | gstack-*  | H-03      | `receipts/runtime-boundary.yml` |
| `benchmark-models`                             | `gstack-benchmark-models`      | gstack-*  | H-03      | `receipts/runtime-boundary.yml` |
| `benchmark`                                    | `gstack-benchmark`             | gstack-*  | H-03      | `receipts/runtime-boundary.yml` |
| `gstack-upgrade`                               | `gstack-upgrade`               | gstack-*  | H-03      | `receipts/runtime-boundary.yml` |
| `ios-clean`                                    | `gstack-ios-clean`             | gstack-*  | H-03      | `receipts/runtime-boundary.yml` |
| `ios-design-review`                            | `gstack-ios-design-review`     | gstack-*  | H-03      | `receipts/runtime-boundary.yml` |
| `ios-fix`                                      | `gstack-ios-fix`               | gstack-*  | H-03      | `receipts/runtime-boundary.yml` |
| `ios-sync`                                     | `gstack-ios-sync`              | gstack-*  | H-03      | `receipts/runtime-boundary.yml` |
| `ios-qa`                                       | `gstack-ios-qa`                | gstack-*  | H-03      | `receipts/runtime-boundary.yml` |
| `openclaw/skills/gstack-openclaw-ceo-review`   | `gstack-openclaw-ceo-review`   | gstack-*  | H-03      | `receipts/runtime-boundary.yml` |
| `openclaw/skills/gstack-openclaw-investigate`  | `gstack-openclaw-investigate`  | gstack-*  | H-03      | `receipts/runtime-boundary.yml` |
| `openclaw/skills/gstack-openclaw-office-hours` | `gstack-openclaw-office-hours` | gstack-*  | H-03      | `receipts/runtime-boundary.yml` |
| `openclaw/skills/gstack-openclaw-retro`        | `gstack-openclaw-retro`        | gstack-*  | H-03      | `receipts/runtime-boundary.yml` |
| `cso`                                          | `gstack-cso`                   | gstack-*  | H-03      | `receipts/runtime-boundary.yml` |
| `codex`                                        | `gstack-codex`                 | gstack-*  | H-03      | `receipts/runtime-boundary.yml` |
| `diagram`                                      | `gstack-diagram`               | gstack-*  | H-03      | `receipts/runtime-boundary.yml` |
| `landing-report`                               | `gstack-landing-report`        | gstack-*  | H-03      | `receipts/runtime-boundary.yml` |
| `office-hours`                                 | `gstack-office-hours`          | gstack-*  | H-03      | `receipts/runtime-boundary.yml` |
| `spec`                                         | `dev-spec`                     | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `qa`                                           | `dev-qa`                       | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `qa-only`                                      | `dev-qa-only`                  | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `review`                                       | `dev-review`                   | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `ship`                                         | `dev-ship`                     | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `investigate`                                  | `dev-investigate`              | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `careful`                                      | `dev-careful`                  | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `retro`                                        | `dev-retro`                    | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `plan-eng-review`                              | `dev-plan-eng-review`          | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `plan-devex-review`                            | `dev-plan-devex-review`        | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `plan-design-review`                           | `dev-plan-design-review`       | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `plan-ceo-review`                              | `dev-plan-ceo-review`          | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `plan-tune`                                    | `dev-plan-tune`                | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `devex-review`                                 | `dev-devex-review`             | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `design-review`                                | `dev-design-review`            | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `design-html`                                  | `dev-design-html`              | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `design-consultation`                          | `dev-design-consultation`      | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `design-shotgun`                               | `dev-design-shotgun`           | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `document-generate`                            | `dev-document-generate`        | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `document-release`                             | `dev-document-release`         | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `freeze`                                       | `dev-freeze`                   | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `unfreeze`                                     | `dev-unfreeze`                 | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `guard`                                        | `dev-guard`                    | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `health`                                       | `dev-health`                   | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `canary`                                       | `dev-canary`                   | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `land-and-deploy`                              | `dev-land-and-deploy`          | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `skillify`                                     | `dev-skillify`                 | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `learn`                                        | `dev-learn`                    | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `pair-agent`                                   | `dev-pair-agent`               | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `setup-deploy`                                 | `dev-setup-deploy`             | dev-*     | H-03      | `receipts/runtime-boundary.yml` |
| `context-save`                                 | `context-save`                 | context-* | H-03      | `receipts/runtime-boundary.yml` |
| `context-restore`                              | `context-restore`              | context-* | H-03      | `receipts/runtime-boundary.yml` |
| `sync-gbrain`                                  | `context-sync-gbrain`          | context-* | H-03      | `receipts/runtime-boundary.yml` |
| `setup-gbrain`                                 | `context-setup-gbrain`         | context-* | H-03      | `receipts/runtime-boundary.yml` |
| `scrape`                                       | `web-scrape`                   | web-*     | H-03      | `receipts/runtime-boundary.yml` |
| `browse`                                       | `web-browse`                   | web-*     | H-03      | `receipts/runtime-boundary.yml` |
| `open-gstack-browser`                          | `web-open-browser`             | web-*     | H-03      | `receipts/runtime-boundary.yml` |
| `setup-browser-cookies`                        | `web-setup-browser-cookies`    | web-*     | H-03      | `receipts/runtime-boundary.yml` |
| `browser-skills/hackernews-frontpage`          | `web-hackernews-frontpage`     | web-*     | H-03      | `receipts/runtime-boundary.yml` |
| `make-pdf`                                     | `media-make-pdf`               | media-*   | H-03      | `receipts/runtime-boundary.yml` |

### Homólogo derivation contract (per skill)

- `content_origin: locally_authored_adaptation`
- `derivation_mode: clean-room-prose-from-permissive-reference`
- `external_fragments_reused: false`
- `license: LicenseRef-MetodologIA-Internal`
- `metadata.model_agnostic: true`
- `publication_authority: false`
- `authority_refs`: `skills/vendor/gstack/<path>/SKILL.md` (read-only) +
  `core/contracts/creation-v3.ts` (H-03 contract)
- SKILL.md line: `Derivada de <skill> (garrytan/gstack, MIT)`

### Stretch handling (gstack-* product-internal, 19 skills)

Per user decision "homologue all 59 literally" + plan risk #5: gstack-internal
infra skills (ios-sync, gstack-upgrade, openclaw-*, cso, codex) do not translate
1:1 — they invoke gstack-specific runtime. Homólogos **describe the capability in
MetodologIA prose**, fail-closed (`execution_boundary: requires_user_confirmation`)
if invocable. Adapt the principle (e.g. "gstack-upgrade" → homólogo describes a
self-upgrade discipline), do NOT clone gstack-isms that do not apply to
MetodologIA. Homólogo names preserved literally per user choice.

## License guard

- Vendored skills are **MIT** (LICENSE at source root, copied to vendor root).
- Homólogos are **clean-room prose adaptations** (`LicenseRef-MetodologIA-Internal`,
  `derivation_mode: clean-room-prose-from-permissive-reference`,
  `external_fragments_reused: false`). MIT attribution preserved in LINEAGE.yml.
- `check-skill.mjs` self-contained (no import of vendor code) → no viral license
  surface.
- Vendor copy (incl. all scripts) excluded from toolchain → not typechecked, not
  linted, not executed, not in `verify:skills`.

Full lock: [`source-lock.json`](./source-lock.json).
