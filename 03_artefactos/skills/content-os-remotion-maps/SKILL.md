---
name: content-os-remotion-maps
description: This skill should be used when the user asks to "animate a map in Remotion", "Remotion Mapbox", "Remotion static map", "Remotion geo animation", "Remotion satellite map", or "data-driven map in Remotion". Pick exactly one map technique (static satellite image, Mapbox, geo/data-viz) and animate frame-driven on top of it via useCurrentFrame + interpolate. Sits beside `remotion-video-production` (MetodologIA canonical). Clean-room prose from the Remotion publisher reference (source-available, Remotion AG). Output stays RENDERED_DRAFT; production gates G13-G17 manual. Unclear → content-os-remotion-best-practices.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires exact H-03 toolchain pins (Remotion 4.0.494, React 19). Sits beside `remotion-video-production`. Maps are markup; scaffold via `content-os-remotion-create`, render via `content-os-remotion-render`. No runtime dependency added.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Remotion Maps — animate on top of a map

Derivada de `remotion-maps` (`remotion/remotion-publisher`, source-available
Remotion AG). Locally-authored clean-room prose adaptation for the Frames ContentOS
toolchain. Vendor reference: `skills/vendor/remotion-publisher/remotion-maps/SKILL.md`
(read-only). Sits beside `remotion-video-production` (MetodologIA canonical).

Pick exactly one technique for the intended shot, then load only that technique. Each
technique is self-contained. This skill is the routing + frame-driven guidance; it does
not scaffold the project (`content-os-remotion-create`) or render (`content-os-remotion-render`).

## Techniques

| technique                | requires                             | notes                                                                             |
| ------------------------ | ------------------------------------ | --------------------------------------------------------------------------------- |
| **Static satellite map** | a satellite image mounted in `<Img>` | animate on top via `useCurrentFrame` + `interpolate`; no network in render path   |
| **Mapbox**               | a Mapbox key                         | nicer default styles; round globe when zoomed out; opt-in auth-gated, fail-closed |
| **Geo / data-viz map**   | projected coordinates + data         | frame-driven via `interpolate`; no live API in render path                        |

Choose one. Do not mix techniques in a single composition unless each is isolated in its
own `<Sequence>`.

## Frame-driven map animation

Drive every motion with `useCurrentFrame()` and `interpolate()`:

- Pan / zoom: `interpolate(frame, [start, end], [x0, x1])` on the map layer; clamp.
- Route draw: `interpolate(frame, [start, end], [0, pathLength])` and stroke-dashoffset.
- Pin drop: `Easing.spring()` on the y-offset at the arrival frame.
- Mask reveal: `interpolate` on a clip-path / opacity; never CSS `transition`.

No `Math.random`, `Date.now`, `new Date`, `fetch`, `setTimeout`, `setInterval` in the
render path. Map tiles are assets — local first-party version-pinned, or remote opt-in
auth-gated fail-closed. A live tile fetch during render breaks determinism.

## Static satellite map

1. Grab the satellite image once (off-render), mount it in `<Img>` with `delayRender`
   until decoded.
2. Animate overlays (pins, routes, masks) on top via frame-driven tweens.
3. No Mapbox key, no network — simplest deterministic path.

## Mapbox

1. Require a Mapbox key (opt-in auth-gated fail-closed); never hard-code a key in a
   composition; pass it via `defaultProps` / env at register time.
2. Prefer a pre-rendered Mapbox snapshot (image) mounted in `<Img>` for determinism; a
   live Mapbox canvas in render path is non-deterministic across machines.
3. If a live Mapbox layer is unavoidable, gate it behind a production review (G13-G17) —
   it is NOT `local_capability_only`.

## Geo / data-viz map

1. Project coordinates off-render (deterministic projection function of the data).
2. Render shapes / paths / pins via frame-driven `interpolate` on stroke-dashoffset,
   opacity, scale.
3. No live geocoding / routing API in the render path; pre-resolve all coordinates.

## Determinism contract

Same input + frame ⇒ same pixel output. A render is `RENDERED_DRAFT`; production gates
G13-G17 manual. Remote tiles / keys opt-in auth-gated fail-closed.

## Preflight

1. Confirm exact toolchain pins (Remotion 4.0.494, React 19).
2. Confirm the Remotion license verdict (`H03-LIC-REMOTION-001.yml`).
3. Confirm the chosen technique's assets/keys are pinned / fail-closed.
4. Stop on: live API in render path, unpinned assets, ambiguous license, production
   request without human gate approval.

## Stop rules

Reject `Math.random`, `Date.now`, `new Date`, `fetch`, `setTimeout`, `setInterval`,
live tile / API fetch in render path, hard-coded keys, unpinned remote assets, and
production / publish requests. Remotion stays `local_evaluation` until the license verdict
and G13-G17 gates resolve.

## Verificación

```bash
node skills/content-os-remotion-maps/scripts/check-skill.mjs
pnpm typecheck
pnpm verify:skills
```

Conservar `remotion-video-production`, VS-001, H-01, H-02, n8n y `Root.tsx`
byte-idénticos.

## Referencias

- `skills/remotion-video-production/SKILL.md` — MetodologIA canonical Remotion skill (authority sibling).
- `skills/vendor/remotion-publisher/remotion-maps/SKILL.md` — vendor reference (read-only, source-available Remotion AG).
- `receipts/dependency-audits/H03-LIC-REMOTION-001.yml` — Remotion license verdict + source-available-publisher addendum.
