# emil-skills → MetodologIA architecture mapping

> Reference for Design-OS Fase 2D. Maps the vendored emil-design-eng skill
> (`skills/vendor/emil-skills/skills/emil-design-eng/`) onto the MetodologIA
> `design-emil-design-eng` homólogo. MIT-licensed reference; homólogo is a
> locally-authored clean-room adaptation.

## emil-design-eng model (as vendored)

1 design-engineering skill, MIT (Emil Kowalski 2026), in an 8-skill repo:

- `emil-design-eng` (emilkowalski/skills @ `da80201`) — 674-line doctrine on
  UI polish, component design, animation decisions, and invisible details.
  Core philosophy: taste is trained (not innate), unseen details compound,
  beauty is leverage. Enforces a Before/After markdown-table review format
  for UI code review (exact-property transitions, transform-origin from
  trigger, `:active` scale feedback, ease-out for instant feedback). 7
  sibling skills (animation-vocabulary, apple-design,
  find-animation-opportunities, improve-animations, pick-ui-library,
  prototype, review-animations) are animation/design reference.

## MetodologIA paradigm

H-03 registry (`registries/skills/creation-v3-skill-registry.yml`, validator
`scripts/check-creation-v3-skills.ts`). Fase 2D adds
**`design-emil-design-eng`** derived (clean-room prose) from the vendored
emil-design-eng doctrine. H-03 path: per-skill `runtime-boundary.yml`, 4
append-only events, 3-letter code `EDE`.

## Capability mapping

| vendored skill    | MetodologIA homólogo (Fase 2D) | validator | receipt                          |
| ----------------- | ------------------------------ | --------- | -------------------------------- |
| `emil-design-eng` | `design-emil-design-eng`       | H-03      | per-skill `runtime-boundary.yml` |

### Homólogo derivation contract

- `content_origin: locally_authored_adaptation`
- `derivation_mode: clean-room-prose-from-permissive-reference`
- `external_fragments_reused: false`
- `license: LicenseRef-MetodologIA-Internal`; `metadata.model_agnostic: true`
- `publication_authority: false`
- `authority_refs`: `skills/vendor/emil-skills/skills/emil-design-eng/SKILL.md`, `core/contracts/creation-v3.ts`
- SKILL.md line: `Derivada de emil-design-eng (emilkowalski/skills, MIT)`

## What the homólogo preserves vs. adapts

**Preserves (clean-room prose):**

- Design-engineering intent: taste as differentiator, unseen details compound.
- Before/After markdown-table review format for UI code review.
- Quality bars: exact-property transitions (no `transition: all`), transform-origin from trigger, `:active` scale feedback (0.97), ease-out for instant feedback, nothing appears from nothing (opacity + transform).

**Adapts (MetodologIA context):**

- Attribution: `Derivada de emil-design-eng (emilkowalski/skills, MIT)`.
- Registry: H-03 per-skill runtime-boundary (not v2 shared receipt).
- `check-skill.mjs` self-contained (no import of vendor code; scans tokens; forbids `Math.random`/`Date.now`).
- Animation skills (7 siblings) not homólogued here — gsap-skills (Fase 1G) covers motion library; emil scoped to design-engineering doctrine.

## License guard

- Vendored skill is **MIT** (verified). Homólogo is clean-room prose (`LicenseRef-MetodologIA-Internal`, `external_fragments_reused: false`). MIT attribution preserved in LINEAGE.yml.
- Vendor copy excluded from toolchain (`skills/vendor/**` in tsconfig, prettierignore, eslint, check-privacy). Bypasses reconcile gate RCN-009.
