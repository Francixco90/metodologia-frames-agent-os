# ui-ux-pro-max → MetodologIA architecture mapping

> Reference for Design-OS Fase 2B. Maps the vendored ui-ux-pro-max skill
> (`skills/vendor/ui-ux-pro-max/ui-ux-pro-max/`) onto the MetodologIA
> `design-ui-ux-pro-max` homólogo. MIT-licensed reference; homólogo is a
> locally-authored clean-room adaptation.

## ui-ux-pro-max model (as vendored)

1 generator-based skill, MIT (Next Level Builder 2024), bundling 7 sub-skills

- CLI + stack reference:

* `ui-ux-pro-max` (nextlevelbuilder/ui-ux-pro-max-skill @ `4d140cf`) —
  design-intelligence engine. Manifest `skill.json` v2.11.0: searchable
  local database of 84 UI styles, 192 color palettes, 74 font pairings, 192
  product types, 98 UX guidelines, 104 icon entries, 16 GSAP motion
  presets, 25 chart types across 22 tech stacks. Umbrella SKILL.md
  (196 lines) defines a 10-category priority rule table (Accessibility →
  Charts & Data) and a `--design-system` workflow: analyze requirements →
  generate design system → apply stack-specific rules → review. Search
  script `scripts/search.py` (Python 3.x, no external deps) queries the CSV
  data by `--domain`. 6 sub-skills (`design`, `design-system`, `ui-styling`,
  `brand`, `banner-design`, `slides`) provide focused capabilities. CLI
  (`cli/`, 189 files) generates design systems via `npx ui-ux-pro-max-cli
init --ai {{platform}}`. `stack/` = `claude-website-design-stack`
  composition reference (ui-ux-pro-max knowledge + frontend-design taste +
  Playwright visual feedback + design-audit script).

## MetodologIA paradigm

The repo's H-03 registry (`registries/skills/creation-v3-skill-registry.yml`,
validator `scripts/check-creation-v3-skills.ts`) is the catch-all for
content-os-*, data-visual-composition, motion-library-adapters (41 entries).
Fase 2B adds **`design-ui-ux-pro-max`** derived (clean-room prose from
permissive reference) from the vendored ui-ux-pro-max umbrella SKILL.md
doctrine. H-03 path: registered in `creation-v3-skill-registry.yml`, validated
by `check-creation-v3-skills.ts`, per-skill
`receipts/runtime-boundary.yml` (no shared receipt), 4 append-only events
(null→candidate→quarantined→evaluated→active), 3-letter code `UUP`.

## Capability mapping (vendored → MetodologIA homólogo, Fase 2B)

| vendored skill  | MetodologIA homólogo (Fase 2B) | validator path | receipt binding                  |
| --------------- | ------------------------------ | -------------- | -------------------------------- |
| `ui-ux-pro-max` | `design-ui-ux-pro-max`         | H-03           | per-skill `runtime-boundary.yml` |

### Homólogo derivation contract

- `content_origin: locally_authored_adaptation`
- `derivation_mode: clean-room-prose-from-permissive-reference`
- `external_fragments_reused: false`
- `license: LicenseRef-MetodologIA-Internal`
- `metadata.model_agnostic: true`
- `publication_authority: false`
- `authority_refs`:
  - `skills/vendor/ui-ux-pro-max/ui-ux-pro-max/.claude/skills/ui-ux-pro-max/SKILL.md`
    (read-only reference — umbrella doctrine)
  - `core/contracts/creation-v3.ts` (H-03 contract)
- SKILL.md line: `Derivada de ui-ux-pro-max (nextlevelbuilder/ui-ux-pro-max-skill, MIT)`

## What the homólogo preserves vs. adapts

**Preserves (clean-room prose, same capability):**

- Design-intelligence intent: searchable, priority-based UI/UX design rules.
- 10-category priority model (Accessibility → Charts & Data) with must-have
  checks and anti-patterns.
- Stack-aware recommendations (22 stacks: React, Next.js, Vue, Nuxt, Svelte,
  Astro, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui, etc.).
- `--design-system` workflow shape: analyze requirements → generate design
  system → apply stack rules → review.
- Quality bars: contrast 4.5:1, min touch target 44×44px, base font 16px,
  line-height 1.5, semantic color tokens, motion 150–300ms with
  reduced-motion, CLS < 0.1.

**Adapts (MetodologIA context):**

- CLI/scripts: homólogo describes the generator CLI (`npx
ui-ux-pro-max-cli`) and Python search script as upstream capabilities but
  gates any execution behind explicit user confirmation (fail-closed, per
  "no activar conectores ni publicar" + `RENDERED_DRAFT != ... !=
PUBLISHED`). No auto-execute, no auto-install.
- Data: homólogo encodes the rule doctrine in prose + check-skill.mjs
  token scans (self-contained, no import of vendor CSV data or scripts).
  The 84 styles / 192 palettes / 74 fonts live in the vendored reference
  only; the homólogo teaches the priority model, not the full dataset.
- Attribution: `Derivada de ui-ux-pro-max (nextlevelbuilder/ui-ux-pro-max-skill, MIT)`.
- Registry: H-03 path with per-skill `runtime-boundary.yml` (not v2 shared
  receipt).
- `check-skill.mjs` self-contained (no import of vendor code; scans tokens;
  forbids `Math.random`/`Date.now`).

## License guard

- Vendored skill is **MIT** (verified). MIT permits redistribution +
  modification with attribution.
- Homólogo is a **clean-room prose adaptation**
  (`LicenseRef-MetodologIA-Internal`, `derivation_mode:
clean-room-prose-from-permissive-reference`, `external_fragments_reused:
false`). MIT attribution preserved in `LINEAGE.yml` (`Derivada de
ui-ux-pro-max (nextlevelbuilder/ui-ux-pro-max-skill, MIT)`).
- `check-skill.mjs` self-contained (no import of vendor code) → no viral
  license surface.
- Vendor copy excluded from toolchain (`skills/vendor/**` in tsconfig,
  prettierignore, eslint, check-privacy) → not typechecked, not linted, not
  in `verify:skills`. Vendor bypasses reconcile gate RCN-009 via
  `if (name === 'vendor') return false`.
