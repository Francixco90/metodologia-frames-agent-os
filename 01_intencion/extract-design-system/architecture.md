# extract-design-system → MetodologIA architecture mapping

> Reference for Design-OS Fase 2D. Maps the vendored extract-design-system
> skill (`skills/vendor/extract-design-system/extract-design-system/`) onto
> the MetodologIA `design-extract-design-system` homólogo. MIT-licensed
> reference; homólogo is a locally-authored clean-room adaptation.

## extract-design-system model (as vendored)

1 generator-based skill, MIT (Arvind 2026):

- `extract-design-system` (arvindrk/extract-design-system @ `1873741`) —
  CLI v0.1.11 (`bin: extract-design-system` + `extract-design-system-mcp`).
  Extracts design primitives (colors, typography, spacing, border radius,
  shadows) from a public website via Playwright headless chromium →
  `.extract-design-system/normalized.json` + CSS custom properties. Skill
  SKILL.md workflow: confirm public URL → `npx extract-design-system <url>`
  → review normalized.json (primary/secondary/accent colors, fonts,
  spacing/radius/shadow scales) → optional starter files. CLI source in
  `src/` (cli.ts, mcp.ts, commands/{extract,init,write-design-system}.ts,
  adapters/dembrandt.ts, scanners/{pattern,file}-scanner.ts,
  normalize/normalize.ts, schemas/{normalized,audit}.ts, utils/, formatters/).

## MetodologIA paradigm

H-03 registry. Fase 2D adds **`design-extract-design-system`** derived
(clean-room prose) from the vendored extract-design-system doctrine. H-03
path: per-skill `runtime-boundary.yml`, 4 append-only events, 3-letter code
`EDS`.

## Capability mapping

| vendored skill          | MetodologIA homólogo (Fase 2D) | validator | receipt                          |
| ----------------------- | ------------------------------ | --------- | -------------------------------- |
| `extract-design-system` | `design-extract-design-system` | H-03      | per-skill `runtime-boundary.yml` |

### Homólogo derivation contract

- `content_origin: locally_authored_adaptation`
- `derivation_mode: clean-room-prose-from-permissive-reference`
- `external_fragments_reused: false`
- `license: LicenseRef-MetodologIA-Internal`; `metadata.model_agnostic: true`
- `publication_authority: false`
- `authority_refs`: `skills/vendor/extract-design-system/extract-design-system/skills/extract-design-system/SKILL.md`, `core/contracts/creation-v3.ts`
- SKILL.md line: `Derivada de extract-design-system (arvindrk/extract-design-system, MIT)`

## What the homólogo preserves vs. adapts

**Preserves (clean-room prose):**

- Token-extraction intent: reverse-engineer a public website's design primitives into starter token files.
- Workflow shape: confirm public URL → extract (Playwright) → review normalized.json (colors, fonts, spacing, radius, shadows) → optional starter files.
- Fail-closed: do not overwrite existing design system without confirmation.

**Adapts (MetodologIA context):**

- CLI/MCP: homólogo describes `npx extract-design-system` + Playwright as upstream capability but gates any execution/extract behind explicit user confirmation (fail-closed, per "no activar conectores ni publicar" + `RENDERED_DRAFT != ... != PUBLISHED`). No auto-execute, no auto-install (Playwright chromium).
- Attribution: `Derivada de extract-design-system (arvindrk/extract-design-system, MIT)`.
- Registry: H-03 per-skill runtime-boundary (not v2 shared receipt).
- `check-skill.mjs` self-contained (no import of vendor CLI/src; scans tokens; forbids `Math.random`/`Date.now`).

## License guard

- Vendored skill is **MIT** (verified). Homólogo is clean-room prose (`LicenseRef-MetodologIA-Internal`, `external_fragments_reused: false`). MIT attribution preserved in LINEAGE.yml.
- Vendor copy excluded from toolchain (`skills/vendor/**` in tsconfig, prettierignore, eslint, check-privacy). Bypasses reconcile gate RCN-009.
