# HTML+GSAP → Remotion API Map (H→R)

Authoritative translation table for the H→R direction — the **inverse** mapping,
native to Content OS. The vendor `remotion-to-hyperframes` skill explicitly
declines this direction; Content OS owns it. Load this reference at plan time
to know the high-level mapping.

## Reading this table

- **`drop`** = remove from output entirely. Remotion handles it.
- **`refuse + interop`** = bow out and recommend the runtime interop pattern
  (see [escape-hatch.md](escape-hatch.md)). Do not translate.
- **`note`** = translate after dropping the construct; log the gap in
  `TRANSLATION_NOTES.md`.

## Composition root

| HTML+GSAP                                                                                                | Remotion                                                           |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| root `<div id="stage" data-composition-id data-start="0" data-duration data-fps data-width data-height>` | `<Composition id durationInFrames={dur*fps} fps width height>`     |
| `data-*` scalar props on `#stage`                                                                        | `defaultProps={...}` (one prop per `data-*`)                       |
| implicit schema in HTML structure                                                                        | `schema={z.object({...})}` — reconstruct from the `data-*` types   |
| concrete values resolved before emit                                                                     | `calculateMetadata` (sync) if the source derived values at runtime |
| `window.__timelines["<id>"] = tl`                                                                        | `registerRoot(RemotionRoot)`                                       |
| `<div style="position:absolute;inset:0;{style}">`                                                        | `<AbsoluteFill style={...}>`                                       |

## Sequencing

| HTML+GSAP                                                                  | Remotion                                   |
| -------------------------------------------------------------------------- | ------------------------------------------ |
| `<div data-start="<F/fps>" data-duration="<D/fps>" data-track-index="N">`  | `<Sequence from={F} durationInFrames={D}>` |
| siblings with sequential `data-start` values                               | `<Series>` + `<Series.Sequence>`           |
| bounded GSAP repeat from the available duration                            | `<Loop durationInFrames={D}>`              |
| no-op (seek-driven timeline has no running animation outside the timeline) | `<Freeze frame={F}>` (rarely needed)       |

## Timing (highest-leverage section)

| HTML+GSAP                                                                         | Remotion                                                                                                                  |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| paused timeline, the runtime seeks it                                             | `useCurrentFrame()` — the derivation becomes `frame`-based math                                                           |
| `data-fps` / `data-duration` on `#stage`                                          | `useVideoConfig()` for `fps` / `durationInFrames`                                                                         |
| `gsap.fromTo(t, {p:x}, {p:y, duration:(b-a)/fps, ease:"none"})` at offset `a/fps` | `interpolate(frame, [a,b], [x,y])` (linear)                                                                               |
| three `gsap.to` calls at offsets `a/fps`, `b/fps`, `c/fps`                        | `interpolate(frame, [a,b,c,d], [x,y,y,z])` (multi-segment)                                                                |
| GSAP `CustomEase.create("c", "M0,0 C${a},${b} ${c},${d} 1,1")`                    | `interpolate(..., {easing: Easing.bezier(a,b,c,d)})`                                                                      |
| GSAP `back.out(N)`                                                                | `spring({frame, fps, config: {damping, stiffness, mass}})` — overshoot N → damping (approximate inverse of the R→H table) |
| `gsap.to({...}, { backgroundColor, color, duration, ease })`                      | `interpolateColors(frame, range, colors)`                                                                                 |
| GSAP `power<N>.in` / `power<N>.out` / `power<N>.inOut`                            | `Easing.in / .out / .inOut(power)`                                                                                        |

## Media (delegate to content-os-media; offline default + remote opt-in auth-gated)

| HTML+GSAP                                                                 | Remotion                                                                  |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `<audio data-start data-duration data-track-index data-volume src>`       | `<Audio src volume>`                                                      |
| `data-playback-rate`, `data-trim-start`, `data-trim-end`                  | `<Audio playbackRate startFrom endAt>`                                    |
| `<video muted playsinline data-start data-duration data-track-index src>` | `<Video src>` (or `<OffthreadVideo>` for large files)                     |
| `<img>`                                                                   | `<Img src>`                                                               |
| `<iframe>` (screenshot-mode fallback)                                     | `<IFrame src>`                                                            |
| `"assets/x.png"` next to `index.html`                                     | `staticFile("x.png")` — move the file into `public/`                      |
| Frame Adapter waits on asset readiness                                    | `delayRender()` / `continueRender()` (only if the asset needs async prep) |

## Transitions

| HTML+GSAP                                                                   | Remotion                                                                       |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| manual `gsap.to(scene, {opacity: 0/1, duration})` crossfade at the boundary | `<TransitionSeries>` + `<TransitionSeries.Transition presentation={fade()} />` |
| closest GSAP-equivalent motion (clip-path wipe, x-percent slide)            | `slide()`, `wipe()`, `clockWipe()`, `fade()` — pick the closest presentation   |
| duration in seconds (`/fps`)                                                | `linearTiming({durationInFrames})`                                             |
| duration in seconds, ease `back.out`                                        | `springTiming({config})`                                                       |

## Lottie

| HTML+GSAP                                                                                                         | Remotion                        |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `<div id="lottie-N">` + `<script>const anim = lottie.loadAnimation({...}); window.__hfLottie.push(anim)</script>` | `<Lottie animationData={data}>` |
| player seek behavior checked; adapter seeks absolute time via `goToAndStop`                                       | `loop` / `playbackRate` props   |
| `lottie-web` from CDN (remote, opt-in) OR vendored local copy (offline)                                           | `@remotion/lottie` runtime      |

## Fonts

| HTML+GSAP                                                                  | Remotion                                            |
| -------------------------------------------------------------------------- | --------------------------------------------------- |
| `@font-face` rule OR `<link>` to Google Fonts in `<head>` (remote, opt-in) | `loadFont()` from `@remotion/google-fonts/<Family>` |
| local `@font-face` pasted into `<style>`                                   | Local font via `@font-face`                         |
| system fonts (offline, concrete-render-safe)                               | System font fallback — document the divergence cost |

## Parameters

| HTML+GSAP                                             | Remotion                      |
| ----------------------------------------------------- | ----------------------------- |
| `data-foo` on `#stage`                                | `z.object({foo: z.string()})` |
| repeated HTML markup with per-instance `data-*` attrs | nested array prop (`stats[]`) |
| defaults baked into the HTML directly                 | Zod default values            |
| validate in the translation step before emitting      | Zod runtime validation        |

## Blockers (refuse + interop)

The H→R linter refuses translation when the HTML source violates the determinism
contract that makes a clean frame-driven port possible:

| Pattern                                                             | Why it blocks                                                        |
| ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| no `window.__timelines` registration                                | the composition is not seek-driven; can't map to `useCurrentFrame()` |
| non-paused timeline (`paused: false` or omitted)                    | running animation can't be frame-captured deterministically          |
| `Date.now()` / `Math.random()` / `new Date()` / `performance.now()` | non-deterministic time/random — Remotion can't reproduce a frame     |
| `fetch` / `setTimeout` / `setInterval`                              | network/timer side effects break the frame model                     |
| state-driven motion (event handlers driving tweens)                 | not a pure function of frame; can't map to `interpolate`             |
| network in render path (`https://` asset refs without auth gating)  | breaks offline-first; the Remotion render would reach the network    |

If any blocker fires, recommend the runtime interop pattern (see
[escape-hatch.md](escape-hatch.md)): bundle the HTML+GSAP source with its
runtime and let Remotion drive it, rather than emitting silently-wrong React.
Translating past a blocker is the `unapproved-interop` violation.

## Warnings (translate after dropping)

| Pattern                             | Action                                                        |
| ----------------------------------- | ------------------------------------------------------------- |
| `useCallback`/`useMemo` analogs     | none in HTML — drop nothing                                   |
| custom hook (pure frame derivation) | inline the body into the React component                      |
| `repeat: -1` (infinite)             | translate to a bounded `<Loop>` from the composition duration |

## When to bow out entirely

If any blocker pattern is present, recommend the runtime interop pattern (see
[escape-hatch.md](escape-hatch.md)) instead of attempting translation. The
H→R interop bundles the HTML+GSAP source, mounts it inside a Remotion
`<AbsoluteFill>` via an iframe or the GSAP runtime, pauses the timeline, and
seeks it frame-by-frame from a `useCurrentFrame()` driver. The output is
Remotion-wrapped HTML, not a translation — but it renders deterministically.
