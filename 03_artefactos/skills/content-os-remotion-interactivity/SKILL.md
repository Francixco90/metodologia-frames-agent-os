---
name: content-os-remotion-interactivity
description: This skill should be used when the user asks to "make Remotion interactive", "Remotion Studio interactivity", "Remotion selectable items", "Remotion drag and drop / resize / rotate", "Remotion editable CSS / keyframes / easing in Studio", or "structure Remotion markup for interactivity". Structure Remotion markup so the Remotion Studio recognizes it and makes items selectable, draggable, resizable, rotatable, and their CSS/keyframes/easing editable — purely a markup-structure contract, not a runtime behavior. Sits beside `remotion-video-production` (MetodologIA canonical). Clean-room prose from the Remotion publisher reference (source-available, Remotion AG). Output stays RENDERED_DRAFT; production gates G13-G17 manual. Unclear → content-os-remotion-best-practices.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires exact H-03 toolchain pins (Remotion 4.0.494, React 19). Sits beside `remotion-video-production`. Interactivity is a markup-structure contract for the Studio; render output stays deterministic. No runtime dependency added.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Remotion Interactivity — structure markup for the Studio

Derivada de `remotion-interactivity` (`remotion/remotion-publisher`, source-available
Remotion AG). Locally-authored clean-room prose adaptation for the Frames ContentOS
toolchain. Vendor reference: `skills/vendor/remotion-publisher/remotion-interactivity/SKILL.md`
(read-only). Sits beside `remotion-video-production` (MetodologIA canonical).

By writing Remotion markup in a specific way, the Remotion Studio recognizes the
structure and makes it interactive: selecting items by clicking, drag+drop, resizing,
rotation, editing CSS styles, and making keyframes / easing values editable. This is a
markup-structure contract recognized by the Studio — it is **not** a runtime behavior and
does not change the deterministic render.

## What this skill does

- Structure markup so the Studio can select / drag / resize / rotate items.
- Expose CSS styles, keyframes, and easing values as editable in the Studio.
- Keep the render deterministic: interactivity is an authoring affordance, not a runtime
  branch.

## What it does NOT do

- Add interaction to the rendered MP4 (the render is always deterministic frame output).
- Introduce `requestAnimationFrame`, `getBoundingClientRect`, `addEventListener`, or any
  DOM-event-driven path into the render.

## Determinism contract

The render path is unchanged: `useCurrentFrame()` + `interpolate()` only. Interactivity
affordances are Studio-only metadata on the markup; they do not appear in the render path.
No `Math.random`, `Date.now`, `new Date`, `fetch`, `setTimeout`, `setInterval`,
`requestAnimationFrame`, `getBoundingClientRect` in the render path. A render is
`RENDERED_DRAFT`; production gates G13-G17 manual.

## Structure rules

1. Give each interactive element a stable `id` and a clear component boundary; the Studio
   selects by component structure.
2. Expose the values you want editable (position, scale, rotation, color, easing) as
   props or `interpolate` inputs with named ranges — the Studio recognizes these as
   keyframes / curves.
3. Keep the animation clock `useCurrentFrame()`; the Studio scrubs frames, not time.
4. No DOM-event handlers in the render path (`onClick`, `onDrag` are Studio-only; they
   must not branch the render).

## Preflight

1. Confirm exact toolchain pins (Remotion 4.0.494, React 19).
2. Confirm the Remotion license verdict (`H03-LIC-REMOTION-001.yml`).
3. Confirm interactivity affordances do not branch the deterministic render path.
4. Stop on: DOM-event-driven render branching, `requestAnimationFrame` /
   `getBoundingClientRect` in render, network in render path, production request without
   human gate approval.

## Stop rules

Reject `Math.random`, `Date.now`, `new Date`, `fetch`, `setTimeout`, `setInterval`,
`requestAnimationFrame`, `getBoundingClientRect` in the render path, DOM-event-driven render
branching, unpinned remote assets, and production / publish requests. Remotion stays
`local_evaluation` until the license verdict and G13-G17 gates resolve.

## Verificación

```bash
node skills/content-os-remotion-interactivity/scripts/check-skill.mjs
pnpm typecheck
pnpm verify:skills
```

Conservar `remotion-video-production`, VS-001, H-01, H-02, n8n y `Root.tsx`
byte-idénticos.

## Referencias

- `skills/remotion-video-production/SKILL.md` — MetodologIA canonical Remotion skill (authority sibling).
- `skills/vendor/remotion-publisher/remotion-interactivity/SKILL.md` — vendor reference (read-only, source-available Remotion AG).
- `receipts/dependency-audits/H03-LIC-REMOTION-001.yml` — Remotion license verdict + source-available-publisher addendum.
