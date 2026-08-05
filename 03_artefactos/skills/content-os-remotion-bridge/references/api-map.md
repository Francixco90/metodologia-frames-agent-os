# Remotion → HTML+GSAP API Map (R→H)

Authoritative translation table for the R→H direction. Load this reference at
plan time to know the high-level mapping; load the per-topic sub-rows for
fragile details. Adapted from the vendor `remotion-to-hyperframes` skill
(Apache-2.0, see LINEAGE) — Frames ContentOS drops the vendor CLI (`npx hyperframes`)
and renders via the local Frames ContentOS render adapter (Playwright-based).

## Reading this table

- **`drop`** = remove from output entirely. The HTML+GSAP runtime handles it.
- **`refuse + interop`** = the skill bows out and recommends the runtime
  interop pattern (see [escape-hatch.md](escape-hatch.md)). Do not translate.
- **`note`** = translate after dropping the construct; log the gap in
  `TRANSLATION_NOTES.md`.

## Composition root

| Remotion                                             | HTML+GSAP                                                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `<Composition id durationInFrames fps width height>` | root `<div id="stage" data-composition-id data-start="0" data-duration="<dur/fps>" data-fps data-width data-height>`      |
| `defaultProps={...}`                                 | `data-*` attributes on `#stage` (one per scalar prop). Nested objects/arrays → repeated markup with per-instance `data-*` |
| `schema={z.object(...)}`                             | not represented in HTML; the schema lives in the translation step only                                                    |
| `calculateMetadata` (sync)                           | resolve at translation time, write concrete values into `data-*`                                                          |
| `calculateMetadata` (async)                          | **refuse + interop** — see [escape-hatch.md](escape-hatch.md)                                                             |
| `registerRoot(RemotionRoot)`                         | drop                                                                                                                      |
| `<AbsoluteFill style>`                               | `<div style="position:absolute;inset:0;{style}">`                                                                         |

## Sequencing

| Remotion                                   | HTML+GSAP                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `<Sequence from={F} durationInFrames={D}>` | `<div data-start="<F/fps>" data-duration="<D/fps>" data-track-index="N">`                  |
| `<Series>` + `<Series.Sequence>`           | siblings with sequential `data-start` values                                               |
| `<Loop durationInFrames={D}>`              | not a primitive — emit a bounded GSAP repeat from the available duration (finite, no `-1`) |
| `<Freeze frame={F}>`                       | drop the wrapper; the seek-driven timeline has no running animation to freeze              |

## Timing (highest-leverage section)

| Remotion                                                   | HTML+GSAP                                                                                                                   |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `useCurrentFrame()`                                        | drop — the runtime seeks the timeline. The math derived from `frame` becomes an animatable property of a paused GSAP tween. |
| `useVideoConfig()` for `fps` / `durationInFrames`          | drop — read from `data-fps` / `data-duration` on `#stage`                                                                   |
| `interpolate(frame, [a,b], [x,y])` (linear)                | `gsap.fromTo(t, {p:x}, {p:y, duration:(b-a)/fps, ease:"none"})` at offset `a/fps`                                           |
| `interpolate(frame, [a,b,c,d], [x,y,y,z])` (multi-segment) | three `gsap.to` calls at offsets `a/fps`, `b/fps`, `c/fps`                                                                  |
| `interpolate(..., {easing: Easing.bezier})`                | GSAP `CustomEase.create("c", "M0,0 C${a},${b} ${c},${d} 1,1")`                                                              |
| `spring({frame, fps, config: {damping, stiffness, mass}})` | GSAP `back.out(N)` — damping → overshoot table: damping 10→N 1.2, damping 18→N 0.8, damping 26→N 0.4 (approximate)          |
| `interpolateColors(frame, range, colors)`                  | `gsap.to({...}, { backgroundColor, color, duration, ease })` — GSAP handles color tweens natively                           |
| `Easing.in / .out / .inOut(power)`                         | GSAP `power<N>.in` / `power<N>.out` / `power<N>.inOut`                                                                      |

## Media (delegate to content-os-media; offline default + remote opt-in auth-gated)

| Remotion                               | HTML+GSAP                                                                        |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| `<Audio src volume>`                   | `<audio data-start data-duration data-track-index data-volume src>`              |
| `<Audio playbackRate startFrom endAt>` | `data-playback-rate`, `data-trim-start`, `data-trim-end`                         |
| `<Video src>`                          | `<video muted playsinline data-start data-duration data-track-index src>`        |
| `<OffthreadVideo>`                     | `<video>` — the headless render does not need the off-thread variant             |
| `<Img src>`                            | `<img>`                                                                          |
| `<IFrame src>`                         | `<iframe>` — the render adapter falls back to screenshot mode for nested iframes |
| `staticFile("x.png")`                  | `"assets/x.png"` — copy the file into `assets/` next to `index.html`             |
| `delayRender()` / `continueRender()`   | drop — the Frame Adapter pattern waits on asset readiness                        |

## Transitions

| Remotion                                                                       | HTML+GSAP                                                                                                   |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `<TransitionSeries>` + `<TransitionSeries.Transition presentation={fade()} />` | manual `gsap.to(scene, {opacity: 0/1, duration})` crossfade at the boundary                                 |
| `slide()`, `wipe()`, `clockWipe()`, `fade()`                                   | closest GSAP-equivalent motion (clip-path wipe, x-percent slide) — pick the closest, note the approximation |
| `linearTiming({durationInFrames})`                                             | duration in seconds (`/fps`)                                                                                |
| `springTiming({config})`                                                       | duration in seconds, ease `back.out`                                                                        |

## Lottie

| Remotion                        | HTML+GSAP                                                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `<Lottie animationData={data}>` | `<div id="lottie-N">` + `<script>const anim = lottie.loadAnimation({...}); window.__hfLottie.push(anim)</script>` |
| `loop` / `playbackRate` props   | translate only after checking player seek behavior; the adapter seeks absolute time via `goToAndStop`             |
| `@remotion/lottie` runtime      | `lottie-web` from CDN (remote, opt-in) OR vendored local copy (offline) — drop the React wrapper                  |

## Fonts

| Remotion                                            | HTML+GSAP                                                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `loadFont()` from `@remotion/google-fonts/<Family>` | `@font-face` rule OR `<link>` to Google Fonts in `<head>` (remote, opt-in) — prefer system fonts for offline |
| Local font via `@font-face`                         | same — paste the rule into `<style>`                                                                         |
| System font fallback                                | document the font-fallback divergence cost in `TRANSLATION_NOTES.md`                                         |

## Parameters

| Remotion                      | HTML+GSAP                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| `z.object({foo: z.string()})` | `data-foo` on `#stage` (the schema is implicit in HTML structure)                             |
| nested array prop (`stats[]`) | repeated HTML markup with per-instance `data-*` attrs                                         |
| Zod default values            | bake defaults into the HTML directly                                                          |
| Zod runtime validation        | not represented; if validation matters, validate in the translation step before emitting HTML |

## React patterns

| Remotion                                           | HTML+GSAP                                                        |
| -------------------------------------------------- | ---------------------------------------------------------------- |
| Custom React subcomponent (pure, prop-driven)      | inline as repeated HTML using the prop interface as the template |
| `useState` driving animation                       | **refuse + interop**                                             |
| `useReducer` driving animation                     | **refuse + interop**                                             |
| `useEffect(fn, [deps])` (non-empty deps)           | **refuse + interop**                                             |
| `useEffect(fn, [])` (mount-once side effect)       | drop the effect; use `queueMicrotask` if startup work is needed  |
| `useCallback`, `useMemo`                           | drop the wrappers — decorative                                   |
| Custom hook (pure derivation of `useCurrentFrame`) | inline the body                                                  |
| Custom hook with state/effects                     | refuse + interop                                                 |

## Distributed rendering (warnings, not blockers)

`@remotion/lambda` and `@remotion/cloudrun` are deployment configuration —
orthogonal to the rendered composition. The skill emits these as warnings and
drops them in step 4 (translate) with a `TRANSLATION_NOTES.md` entry. HTML+GSAP
is single-machine today; document the gap.

| Remotion                   | HTML+GSAP                                              |
| -------------------------- | ------------------------------------------------------ |
| `@remotion/lambda` import  | drop the import (warning)                              |
| `renderMediaOnLambda(...)` | drop the call; note in `TRANSLATION_NOTES.md`          |
| `@remotion/cloudrun`       | drop the import + call; note in `TRANSLATION_NOTES.md` |

## When to bow out entirely

If any blocker pattern is present, recommend the runtime interop pattern (see
[escape-hatch.md](escape-hatch.md)) instead of attempting translation. The
blockers are: `useState`/`useReducer` driving animation, `useEffect`/`useLayoutEffect`
with non-empty deps, async `calculateMetadata`, third-party React UI libraries
(MUI, Chakra, Mantine, antd, shadcn, Radix, NextUI). Translating past a blocker
is the `unapproved-interop` violation — the output is silently wrong.
