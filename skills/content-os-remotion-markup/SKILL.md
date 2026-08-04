---
name: content-os-remotion-markup
description: This skill should be used when the user asks to "write Remotion React markup", "Remotion animation rules", "interpolate in Remotion", "Remotion timing / sequencing", "Remotion transitions", "Remotion text / images / audio", "Remotion effects", or "Remotion markup best practices". The content, animation and effects best practices for Remotion React markup: frame-driven tweens via useCurrentFrame + interpolate, Easing.bezier/spring, Sequence/AbsoluteDelays, transitions, timing, text, images, audio, calculate-metadata, effects — all deterministic and offline-first. Sits beside `remotion-video-production` (MetodologIA canonical). Clean-room prose from the Remotion publisher reference (source-available, Remotion AG). Output stays RENDERED_DRAFT; production gates G13-G17 manual. Unclear → content-os-remotion-best-practices.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires exact H-03 toolchain pins (Remotion 4.0.494, React 19). Sits beside `remotion-video-production`. Orchestrates `content-os-remotion-create` (composition registration). No runtime dependency added.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Remotion Markup — content / animation / effects

Derivada de `remotion-markup` (`remotion/remotion-publisher`, source-available
Remotion AG). Locally-authored clean-room prose adaptation for the Frames ContentOS
toolchain. Vendor reference: `skills/vendor/remotion-publisher/remotion-markup/SKILL.md`
(read-only). Sits beside `remotion-video-production` (MetodologIA canonical).

This skill is the guidance for writing Remotion React markup. It does not scaffold the
project (`content-os-remotion-create`) or render (`content-os-remotion-render`).

## General rules

Drive every animation with `useCurrentFrame()` and `interpolate()`. CSS `transition`
and `animation` do not render frame-accurately and must be refactored to frame-driven
tweens. Tailwind animation classes likewise do not render and must be refactored.

Use `Easing.bezier()` and `Easing.spring()` to customize timing; never linear unless
explicitly intended. `spring()` is frame-deterministic in Remotion (not physics-clock).

Structure markup per Remotion interactivity best practices (see
`content-os-remotion-interactivity`, Fase 2B batch 3).

## Animation primitives

- `useCurrentFrame()` — the current frame index; the only animation clock.
- `interpolate(frame, [inStart, inEnd], [outStart, outEnd], {easing, extrapolateLeft, extrapolateRight})` — map a frame range to an output range. Clamp with `extrapolateLeft/Right: 'clamp'`.
- `Easing.bezier(cx, cy, dx, dy)` / `Easing.spring({damping, mass, stiffness})` — timing curves.
- `interpolateColors(frame, range, colors)` — color tweens.
- `Sequence` — time-shift a subtree by `from`/`durationInFrames`; nest for layered timing.
- `AbsoluteFill` / `AbsoluteDelay` / `Sequence` — layout + delay primitives.
- `delayRender()` / `continueRender()` — gate rendering on async asset load; never use
  to fake timing.

## Timing & sequencing

- Express every timing in frames (`fps`-relative), never milliseconds.
- `Sequence from={X} durationInFrames={Y}` for a beat; nest for layers.
- A transition between scenes = a short overlap or a `@remotion/transitions` preset
  applied at the seam; never a CSS crossfade.
- Stagger arrivals with a per-item frame offset; `index * staggerFrames`.

## Transitions

Use `@remotion/transitions` presets (fade, slide, wipe, clockWipe) at scene seams. Each
preset is frame-driven and deterministic. Never hand-roll a CSS opacity crossfade.

## Text, images, audio

- **Text** — `<Text>` or HTML; measure with `measureText` / `useFont`; never measure
  DOM nodes during render via `getBoundingClientRect` (use `delayRender` to load fonts,
  then static layout).
- **Images** — `delayRender()` until the image is decoded (`Img` + `onError`); local
  first-party assets version-pinned; remote opt-in auth-gated fail-closed.
- **Audio** — `<Audio src=...>`; local first-party; remote opt-in; never fetch during
  render; `Audio` start via `Sequence from` not `setTimeout`.
- **Fonts** — `@remotion/google-fonts` / `loadFont` + `delayRender`; never a network
  `<link>` in render path.

## Effects & measuring

- `calculateMetadata` for dynamic dims; pure function of props; no temporal/network APIs.
- Effects (light leaks, glow, blur) via `<Video>`/`<Img>`/CSS filters applied per-frame
  through `interpolate`-driven style; never `requestAnimationFrame`.
- Measuring DOM nodes / text: use the static APIs (`measureText`, `delayRender` to
  settle layout), never `getBoundingClientRect` during a render frame.

## Determinism contract (non-negotiable)

No `Math.random`, `Date.now`, `new Date`, `fetch`, `setTimeout`, `setInterval` in the
render path. Same input + frame ⇒ same pixel output. A render is `RENDERED_DRAFT`;
production gates G13-G17 are manual.

## Stop rules

Reject `Math.random`, `Date.now`, `new Date`, `fetch`, `setTimeout`, `setInterval`,
CSS `transition`/`animation`, Tailwind animation classes, `requestAnimationFrame`,
`getBoundingClientRect` during render, `useFrame` (that's R3F; Remotion uses
`useCurrentFrame`), network in render, unpinned assets, and production / publish
requests.

## Verificación

```bash
node skills/content-os-remotion-markup/scripts/check-skill.mjs
pnpm typecheck
pnpm verify:skills
```

Conservar `remotion-video-production`, VS-001, H-01, H-02, n8n y `Root.tsx`
byte-idénticos.

## Referencias

- `skills/remotion-video-production/SKILL.md` — MetodologIA canonical Remotion skill (authority sibling).
- `skills/vendor/remotion-publisher/remotion-markup/SKILL.md` — vendor reference (read-only, source-available Remotion AG).
- `receipts/dependency-audits/H03-LIC-REMOTION-001.yml` — Remotion license verdict + source-available-publisher addendum.
