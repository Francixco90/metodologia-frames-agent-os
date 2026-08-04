# When to bow out: the runtime interop pattern

Some compositions can't be translated cleanly between paradigms. The skill
recognizes them upfront (via the lint step) and recommends the **runtime
interop pattern** instead of producing silently-wrong output. Translating past
a blocker is the `unapproved-interop` violation.

## When to recommend interop

Run the direction-specific linter in step 2. If it returns any blocker,
recommend interop. The blockers are:

### R→H blockers (Remotion source)

| Rule                       | What it catches                                                  |
| -------------------------- | ---------------------------------------------------------------- |
| `r2h/use-state`            | `useState` driving animation                                     |
| `r2h/use-reducer`          | `useReducer` driving animation                                   |
| `r2h/use-effect-deps`      | `useEffect`/`useLayoutEffect` with non-empty deps (side effects) |
| `r2h/async-metadata`       | `calculateMetadata` returns a Promise                            |
| `r2h/third-party-react-ui` | Imports from MUI, Chakra, Mantine, antd, shadcn, Radix, NextUI   |

Each breaks the seek-driven, deterministic-frame model that HTML+GSAP relies
on. Translating them produces silently-wrong output.

### H→R blockers (HTML+GSAP source)

| Pattern                                                             | What it catches                                  |
| ------------------------------------------------------------------- | ------------------------------------------------ |
| no `window.__timelines` registration                                | composition is not seek-driven                   |
| non-paused timeline                                                 | running animation can't be frame-captured        |
| `Date.now()` / `Math.random()` / `new Date()` / `performance.now()` | non-deterministic time/random                    |
| `fetch` / `setTimeout` / `setInterval`                              | network/timer side effects break the frame model |
| state-driven motion                                                 | not a pure function of frame                     |
| network in render path (`https://` without auth)                    | breaks offline-first                             |

Each breaks the frame-driven, deterministic model that Remotion relies on.

## What the interop pattern actually does

The runtime adapter bundles the source with its native runtime and lets the
other paradigm drive it frame-by-frame.

### R→H interop

1. Bundle the user's Remotion code with React + `@remotion/player` via esbuild.
2. Mount a Remotion `<Player>` inside an HTML+GSAP composition.
3. Pause the player on mount.
4. Register the player on `window.__hfRemotion` with `seekTo(frame)`,
   `pause()`, `durationInFrames`, `fps`.
5. The HTML+GSAP render loop seeks the player frame-by-frame via `seekTo(frame)`.

Result: Remotion's React tree renders at the HTML+GSAP runtime's deterministic
frame ticks. Custom hooks, `useState`, `useEffect`, MUI components — all work
because Remotion's React reconciler is doing the rendering.

### H→R interop

1. Bundle the HTML+GSAP source (`index.html` + GSAP timeline) into a standalone
   HTML document.
2. Mount it inside a Remotion `<AbsoluteFill>` via an `<iframe>` (or inline the
   GSAP runtime into a Remotion-rendered DOM).
3. Register the timeline on `window.__timelines` and pause it.
4. From a Remotion component, derive `frame` via `useCurrentFrame()` and seek
   the timeline: `tl.seek(frame / fps)`.
5. Remotion's render loop captures the seeked DOM frame-by-frame.

Result: the HTML+GSAP composition renders at Remotion's deterministic frame
ticks. The GSAP timeline is the source of truth; Remotion drives the seek.

## The recommendation message

When the skill detects a blocker, output something like:

> The source uses `<blocker>`, which can't be translated to the target
> paradigm's deterministic model. The recommended path is the **runtime
> interop pattern**: bundle your source with its native runtime and let the
> other paradigm drive it frame-by-frame.
>
> R→H: bundle with `@remotion/player`, mount in HTML+GSAP, seek via
> `window.__hfRemotion`. H→R: bundle the HTML+GSAP source, mount in a Remotion
> `<AbsoluteFill>`, seek the timeline from `useCurrentFrame()`.

## When NOT to bow out: warnings only

Some patterns produce warnings, not blockers — translate after dropping the
construct and logging the gap in `TRANSLATION_NOTES.md`:

### R→H warnings

| Rule                     | Action                                                            |
| ------------------------ | ----------------------------------------------------------------- |
| `r2h/lambda-import`      | drop the `@remotion/lambda` config; HTML+GSAP runs single-machine |
| `r2h/delay-render`       | drop the call; the Frame Adapter handles asset readiness          |
| `r2h/use-callback`       | drop the wrapper, inline the function                             |
| `r2h/use-memo`           | drop the wrapper, compute inline                                  |
| `r2h/custom-hook` (pure) | inline the hook body if it's a derivation of `useCurrentFrame`    |
| `r2h/static-file`        | replace `staticFile("x")` with `"assets/x"`                       |
| `r2h/interpolate-colors` | translate to GSAP color tween                                     |

### H→R warnings

| Pattern                             | Action                                                        |
| ----------------------------------- | ------------------------------------------------------------- |
| `repeat: -1` (infinite)             | translate to a bounded `<Loop>` from the composition duration |
| custom hook (pure frame derivation) | inline the body into the React component                      |

`r2h/lambda-import` is a warning — not a blocker — because Lambda
configuration is orthogonal to the rendered composition. Translating an
otherwise-clean Remotion comp shouldn't fail just because the author also
configured AWS Lambda for distributed rendering.

## When the source has BOTH blockers AND warnings

Bow out. The presence of a single blocker means the skill shouldn't attempt
translation — even if the rest of the composition is clean. The user should
use interop for the whole thing OR refactor the blocker patterns out of their
source first, then re-run the lint.

## Rebuild-natively fallback

If the source is not a composition in either Content OS paradigm (After Effects
`.aep`, Framer Motion, plain CSS animation, plain React without Remotion),
there is no paradigm source to translate. Decline the translation and
recommend `content-os-general-video` for a fresh native build. The bridge
translates existing paradigm compositions; it does not re-create non-paradigm
sources.
