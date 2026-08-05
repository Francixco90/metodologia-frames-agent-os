# gstack vendor audit — Fase 1P

> Audit date: 2026-08-04 · Auditor: lead · 59 skills, MIT · Per-file sha256 in
> [`source-lock.json`](./source-lock.json).

## Scope

59 skills vendored text-only into `skills/vendor/gstack/` as **reference-only**
input for locally-authored homólogos (expansion Fase 2J-2T, mixed families, H-03
path). 468 vendored files (59 SKILL.md + supporting .ts/.sh/.tmpl/.html/.json/
.swift/.sql/.rb/.css/.yml scripts/templates/config) + LICENSE, 11 image files
excluded (10 PNG + 1 .icns). Source is **MIT licensed** (LICENSE at repo root,
"Copyright (c) 2026 Garry Tan").

## Source resolution

| source repo       | commit    | license | source path                | skills vendored |
| ----------------- | --------- | ------- | -------------------------- | --------------- |
| `garrytan/gstack` | `a325940` | MIT     | repo root (flat structure) | 59 (468 files)  |

Structure: gstack is **flat** — 58 skills live in root-level dirs
(`<skill>/SKILL.md`) plus `browser-skills/hackernews-frontpage/` +
`openclaw/skills/gstack-openclaw-*/` (4 sub-skills). The gstack router skill is
the root `SKILL.md` (1 file). No `skills/` prefix in source paths.

## License

Source is **MIT** (LICENSE file at repo root, "Copyright (c) 2026 Garry Tan").
MIT permits redistribution and modification with attribution. Homólogos derive
under `LicenseRef-MetodologIA-Internal` with `derivation_mode:
clean-room-prose-from-permissive-reference` (MIT-compatible; attribution
preserved in LINEAGE.yml).

## Global audit findings

### 1. License — MIT (LICENSE file at root)

- MIT per LICENSE file at repo root ("Copyright (c) 2026 Garry Tan").
- OSI-approved, no source-available risk.

### 2. Binaries excluded

11 image files excluded (text-only vendoring):

- `make-pdf/test/fixtures/diagram-assets/{wide-arch,huge-noise,wide-screenshot,red-box}.png` (4 PNG, test fixtures inside make-pdf skill dir)
- `extension/icons/{icon-16,icon-48,icon-128}.png` (3 PNG, browser extension icons — non-skill infra, not copied)
- `docs/images/{github-2013,github-2026}.png` (2 PNG, docs — non-skill infra, not copied)
- `scripts/app/icon.icns` (1 Mac OS X icon, 1 MB binary — non-skill infra, not copied)
- `test/fixtures/ios-fix/ios-qa-swiftui-tap-pre.png` (1 PNG, test fixture — non-skill infra, not copied)

All 468 vendored files are UTF-8 text: .md (168), .ts (script/templates), .sh,
.tmpl, .json, .html, .swift, .sql, .rb, .css, .yml, .js, .cjs, .py, .h, .m,
.toml, .plist, .txt, .lock, .example, .ci. `file` reports no
binary/executable/image/font in the vendored set.

### 3. Secrets / PII / private locators

None. Skill files reference public dev-workflow concepts (spec, qa, review,
ship, investigate, ios tooling, gstack-internal infra). No credentials, tokens,
internal hostnames, or PII.

### 4. Network / execution surface

**Present but contained.** gstack skills include shell scripts (.sh), TypeScript
scripts (.ts), Python (.py), Ruby (.rb), Swift (.swift), JS (.js/.cjs) that
could execute dev/QA/deploy/iOS operations. Vendored as **reference-only** —

- Shell/JS/TS/Python/Ruby/Swift scripts NOT executed, NOT made executable
  (`chmod -x` applied), NOT invoked by any validator/runtime.
- No `npx` in vendored text (gstack uses its own CLI, not vendored as runtime).
- Homólogos reproduce guidance as clean-room prose; executable capabilities
  fail-closed (describe in prose, gate behind user confirmation). Product-
  internal infra skills (ios-sync, gstack-upgrade, openclaw-*) are **stretch**
  homólogos — adapt the principle, do NOT clone gstack-specific invocations.

### 5. Content-type verification

468 vendored files + LICENSE are UTF-8 text. 0 binary leaks (11 images
excluded).

## Per-skill checklist (summary)

All 59 skills satisfy: MIT license + attribution preserved, source commit pinned
`a3259400a366593e0c909dd9ac3e59752efd2488`, text-only, no secrets/PII,
`execution_status: reference-only-no-auto-execution`, per-file sha256 in
`source-lock.json`. Shell/JS/TS/Python/Ruby/Swift scripts vendored as
non-executable text reference.

## Homólogo family mapping (59 skills)

| family                                       | count | skills (Fase 2)                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gstack-*` (product-internal infra, stretch) | 19    | router, autoplan, benchmark-models, benchmark, gstack-upgrade, ios-clean, ios-design-review, ios-fix, ios-sync, ios-qa, gstack-openclaw-ceo-review, gstack-openclaw-investigate, gstack-openclaw-office-hours, gstack-openclaw-retro, cso, codex, diagram, landing-report, office-hours                                                                                   |
| `dev-*` (dev workflow)                       | 30    | spec, qa, qa-only, review, ship, investigate, careful, retro, plan-eng-review, plan-devex-review, plan-design-review, plan-ceo-review, plan-tune, devex-review, design-review, design-html, design-consultation, design-shotgun, document-generate, document-release, freeze, unfreeze, guard, health, canary, land-and-deploy, skillify, learn, pair-agent, setup-deploy |
| `context-*` (memory/context)                 | 4     | context-save, context-restore, sync-gbrain, setup-gbrain                                                                                                                                                                                                                                                                                                                  |
| `web-*` (web/scrape/browse)                  | 5     | scrape, browse, open-gstack-browser, setup-browser-cookies, hackernews-frontpage                                                                                                                                                                                                                                                                                          |
| `media-*` (media tools)                      | 1     | make-pdf                                                                                                                                                                                                                                                                                                                                                                  |

## Verdict

**PASS.** 59 skills, MIT (LICENSE at root), 469 text files vendored (468 + LICENSE),
0 binaries (11 images excluded), 0 secrets. Shell/JS/TS/Python/Ruby/Swift scripts
contained as non-executable text reference. Product-internal infra skills (19
gstack-*) are stretch homólogos — adapt principle, fail-closed, do not clone
gstack-isms. Ready for mixed-family homólogos (Fase 2J-2T, H-03 path).
