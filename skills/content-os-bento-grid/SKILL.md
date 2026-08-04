---
name: content-os-bento-grid
description: This skill should be used when the user asks to "design a bento grid", "bento box layout", "bento design system", "bento card blocks", "bento grid guidelines", or "modular grid layout". Author design-system guidelines for bento grids — modular grid layout with card-like blocks, clear hierarchy, soft spacing, subtle visual contrast, WCAG 2.2 AA. Sits beside `content-os-core` (MetodologIA canonical HTML composition). Clean-room prose from the Bento vendor reference (bergside/awesome-design-skills, MIT). Output stays RENDERED_DRAFT; production gates G13-G17 manual. Unclear → content-os-core.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires exact H-03 toolchain pin (Playwright 1.61.1 for screenshot export). Sits beside `content-os-core`. Bento is a design-system guideline skill; the generated guidelines inform deterministic HTML. No runtime dependency added.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Bento Grid — design-system guidelines for bento layouts

Derivada de `bento` (`bergside/awesome-design-skills`, MIT). Locally-authored
clean-room prose adaptation for the Frames ContentOS toolchain. Vendor reference:
`skills/vendor/bento/bento/SKILL.md` (read-only). Sits beside `content-os-core`
(MetodologIA canonical HTML composition).

This skill authors **design-system guidelines** for bento grids. It does not render
or screenshot directly — it produces the token, anatomy, state, and accessibility
rules engineers follow to build bento grids. For HTML generation use `content-os-core`;
for Apple-style screenshot grids use `content-os-bento-apple-grid`.

## Style foundations

- Visual style: modern, clean. Bento = grid layout presenting content in visually
  appealing blocks of varying sizes.
- Typography scale: 12/14/16/20/24/32. Spacing scale: 4/8/12/16/24/32.
- Color: semantic tokens (primary, neutral, success, warning, danger). Never raw values
  in rules — anchor to tokens.
- Accessibility: WCAG 2.2 AA, keyboard-first interactions, visible focus states.

## Guideline authoring workflow

1. Restate the design intent in one sentence before proposing rules.
2. Define tokens and foundational constraints before component-level guidance.
3. Specify component anatomy, states, variants, and interaction behavior.
4. Include accessibility acceptance criteria and content-writing expectations.
5. Add anti-patterns and migration notes for existing inconsistent UI.
6. End with a QA checklist executable in code review.

## Component rules

- Required states: default, hover, focus-visible, active, disabled, loading, error (as relevant).
- Interaction behavior for keyboard, pointer, and touch.
- Explicit spacing, typography, and color-token usage.
- Responsive behavior and edge cases (long labels, empty states, overflow).

## Quality gates

- No rule depends on ambiguous adjectives alone; anchor each rule to a token, threshold, or example.
- Every accessibility statement must be testable in implementation.
- System consistency over one-off local optimizations.
- Flag aesthetics-vs-accessibility conflicts; prioritize accessibility.

## Constraint language

- "must" for non-negotiable rules; "should" for recommendations.
- Pair every do-rule with at least one concrete don't-example.
- New patterns include migration guidance for existing components.

## Determinism contract

Generated guidelines describe a **deterministic** HTML output given content inputs. No
`Math.random`, `Date.now`, `new Date`, `fetch`, `setTimeout`, `setInterval` in the
generated HTML — they make output non-deterministic. Network (Google Fonts, assets) is
view-time, not generation-time. A rendered/screenshot grid is `RENDERED_DRAFT`; production
gates G13-G17 manual.

## Preflight

1. Confirm exact toolchain pin (Playwright 1.61.1 for screenshot export).
2. Confirm the guidelines anchor to tokens, not adjectives.
3. Confirm accessibility statements are testable.
4. Stop on: non-deterministic APIs in generated HTML, ambiguous-only rules, production
   request without human gate approval.

## Stop rules

Reject `Math.random`, `Date.now`, `new Date`, `fetch`, `setTimeout`, `setInterval` in
generated HTML, rules anchored only to adjectives, untestable accessibility statements,
low-contrast text, inconsistent spacing rhythm, ambiguous labels, and production /
publish requests. Bento grids stay `RENDERED_DRAFT` until G13-G17 gates resolve.

## Verificación

```bash
node skills/content-os-bento-grid/scripts/check-skill.mjs
pnpm typecheck
pnpm verify:skills
```

Conservar `content-os-core`, VS-001, H-01, H-02, n8n y `Root.tsx` byte-idénticos.

## Referencias

- `skills/content-os-core/SKILL.md` — MetodologIA canonical HTML composition skill (authority sibling).
- `skills/vendor/bento/bento/SKILL.md` — vendor reference (read-only, MIT).
