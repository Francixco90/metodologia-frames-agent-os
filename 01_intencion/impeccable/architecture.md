# impeccable → MetodologIA architecture mapping

> Reference for Design-OS Fase 2B. Maps the vendored impeccable skill
> (`skills/vendor/impeccable/impeccable/`) onto the MetodologIA
> `design-impeccable` homólogo. Apache-2.0-licensed reference; homólogo is a
> locally-authored clean-room adaptation.

## impeccable model (as vendored)

1 generator-based skill, Apache-2.0 (pbakaus):

- `impeccable` (pbakaus/impeccable @ `ae5e951`) — design-director doctrine +
  CLI engine. Canonical `skill/SKILL.src.md` (85 lines): "design that earns
  to be called out-of-distribution craft" — award-winning design director
  with impeccable understanding. 4 visitor modes (Persuade / Operate / Read /
  Experience), craft floor, anti-AI-slop, brief-wins, refinement-preserves vs
  redesign-replaces. Commands: craft, shape, init, document, extract, redesign,
  critique, harden, polish, animate, live, audit, etc.
  - `skill/agents/` (4): manual-edit-applier, asset-producer, documenter,
    finish-reviewer.
  - `skill/reference/` (35): new-work, craft-floor, operate, shape, typography,
    color, motion, layout, ios, android (ehmo MIT-derived), anti-patterns,
    design-system, extract, redesign, critique, harden, polish, animate, live.
  - `skill/scripts/` (86): context, palette, image-gen, live-edit, critique-
    storage, hooks (runtime scripts the skill invokes).
  - `cli/` (25): the `npx impeccable` engine — antipattern detection
    (regex/browser/visual), design-system, findings, screenshot-contrast,
    fonts, registry, profile.

## MetodologIA paradigm

The repo already has the H-03 `content-os-*` family (39 skills) +
`data-visual-composition` + `motion-library-adapters` in
`registries/skills/creation-v3-skill-registry.yml`. Fase 2B adds
**`design-impeccable`** derived (clean-room prose from permissive reference)
from the vendored impeccable skill. H-03 path: registered in
`creation-v3-skill-registry.yml`, validated by
`scripts/check-creation-v3-skills.ts`, per-skill `receipts/runtime-boundary.yml`
(no shared receipt). 3-letter code `IMP`.

## Capability mapping (vendored → MetodologIA homólogo, Fase 2B)

| vendored skill | MetodologIA homólogo (Fase 2B) | validator path | receipt binding            |
| -------------- | ------------------------------ | -------------- | -------------------------- |
| `impeccable`   | `design-impeccable`            | H-03           | per-skill runtime-boundary |

### Homólogo derivation contract

- `content_origin: locally_authored_adaptation`
- `derivation_mode: clean-room-prose-from-permissive-reference`
- `external_fragments_reused: false`
- `license: LicenseRef-MetodologIA-Internal`
- `metadata.model_agnostic: true`
- `publication_authority: false`
- `authority_refs`:
  - `skills/vendor/impeccable/impeccable/skill/SKILL.src.md` (read-only reference)
  - `core/contracts/creation-v3.ts` (H-03 contract)
- SKILL.md line: `Derivada de impeccable (pbakaus/impeccable, Apache-2.0)`

## What the homólogo preserves vs. adapts

**Preserves (clean-room prose, same capability):**

- Design-director intent: out-of-distribution craft, bold POV, exceptional
  execution. Anti-AI-slop doctrine.
- 4 visitor modes (Persuade / Operate / Read / Experience): choose mode from
  the requested surface, not the product.
- Brief-wins: honor pinned aesthetics even when conflicting with saturated-
  pattern warnings.
- Refinement-preserves vs redesign-replaces semantics.
- Craft floor: absolute bans + reflexes no detector catches.
- Quality-verification in bounded passes (not open-ended self-QA loops).

**Adapts (MetodologIA context):**

- CLI/scripts: homólogo describes the `npx impeccable` engine + skill/scripts
  capabilities in prose but does NOT execute them (reference-only). Any
  screenshot/audit/execute gated behind explicit user confirmation
  (fail-closed, per "no activar conectores ni publicar" + `RENDERED_DRAFT !=
... != PUBLISHED`). No auto-install, no auto-execute.
- Attribution: `Derivada de impeccable (pbakaus/impeccable, Apache-2.0)`.
- Registry: H-03 path with per-skill `runtime-boundary.yml` (no shared
  receipt, no cascade).
- `check-skill.mjs` self-contained (no import of vendor cli/ or skill/scripts/;
  scans tokens; forbids `Math.random`/`Date.now`).

## License guard

- Vendored skill is **Apache-2.0** (verified). Apache-2.0 permits
  redistribution + modification with attribution + NOTICE retention.
- `NOTICE.md` (ehmo/platform-design-skills MIT derivation for ios/android
  reference) preserved in vendored copy.
- Homólogo is a **clean-room prose adaptation**
  (`LicenseRef-MetodologIA-Internal`, `derivation_mode:
clean-room-prose-from-permissive-reference`, `external_fragments_reused:
false`). Apache-2.0 attribution preserved in `LINEAGE.yml` (`Derivada de
impeccable (pbakaus/impeccable, Apache-2.0)`).
- `check-skill.mjs` self-contained (no import of vendor code) → no viral
  license surface.
- Vendor copy excluded from toolchain (`skills/vendor/**` in tsconfig,
  prettierignore, eslint, check-privacy) → not typechecked, not linted, not
  in `verify:skills`. Reconcile gate bypasses vendor dirs (RCN-009:
  `if (name === 'vendor') return false`).
