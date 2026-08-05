# Keyframe pose contract — Remotion

Adapts the HyperFrames `keyframes` pose contract (visible states, continuous
subject identity, seek-safe runtime, verified pixels) to Remotion's frame-driven
model. In Remotion the "pose contract" is enforced by determinism: every
animated value is a pure function of `frame`. See LINEAGE for provenance.

## What a keyframe is in Remotion

A keyframe is a **named visible pose** of an animated subject, expressed as a
pure derivation from `frame` via `interpolate`, `spring` and `Sequence`. It is
not a hidden helper variable, not a side-effect, and not a time-based callback.

## Pose contract

1. **Name the moving subject.** A subject is one element or one coherent group
   (a title card, a chart bar set, a logo). One subject per pose set.
2. **Name the poses needed to prove the intended motion**, including the final
   state. A pose is the visible channel value at a canonical frame (opacity,
   transform, color, scale, position). Keyframe **visible channels**, not
   hidden helper state.
3. **Final frame is part of the animation, not cleanup.** Do not reset to rest
   and do not end on black unless the brief asks.
4. **Preserve object identity when continuity matters.** Crossfade only when the
   intended motion is replacement or dissolve; otherwise interpolate the same
   element through its poses.
5. **Hold readable or semantic states long enough to see.** A pose held for
   fewer frames than the eye resolves is not a pose — it is a glitch.
6. **If editing a starter composition, preserve layout, copy, assets, colors and
   final state** unless asked to redesign.

## Determinism rules (seek-safe)

Remotion is seek-safe by construction **if** the pose contract is honored. The
runtime seeks each frame independently; nothing runs ahead. To keep that
invariant:

| Rule                                                                              | Why                                      |
| --------------------------------------------------------------------------------- | ---------------------------------------- |
| Derive every animated value from `useCurrentFrame()`                              | frame is the only seek-safe clock        |
| Use `interpolate(frame, inputRange, outputRange, opts)` for easing                | pure function, no state                  |
| Use `spring({frame, fps, config})` for physics                                    | deterministic given frame + fps + config |
| Wrap sub-sequences in `<Sequence from={n} durationInFrames={m}>`                  | deterministic timing, no `setTimeout`    |
| Keep `fps`, `durationInFrames`, dimensions as scalar composition props            | no runtime mutation                      |
| Seed any pseudo-randomness first-party-fixed (`random(seed)` with a literal seed) | reproducible across seeks                |

## Forbidden in the pose contract

These break the seek-safe invariant and must be rejected at lint:

- `Date.now()`, `new Date()`, `performance.now()` — wall clock, not seek-safe
- unseeded `Math.random()` — non-reproducible
- `useEffect` that mutates animation state from a timer/network — side-effect
- `requestAnimationFrame` / `setInterval` / `setTimeout` — running clock
- `fetch` / network in the render path — non-deterministic latency
- `getBoundingClientRect` / layout reads — depend on browser timing
- CSS `transition:` on animated elements — browser-driven, not frame-driven
- `state` that accumulates across frames (only frame-derived values)

## Snapshot verification

Verify the pose contract by snapshotting canonical proof frames:

1. Choose proof frames: the first frame of each named pose + the final frame.
2. Render those frames only (`--frames=<n>`) and snapshot pixels (SSIM or hash).
3. A pose is verified when its proof frame matches the expected visible state
   within threshold. Below threshold → fix the source keyframes, not the
   snapshot.
4. Re-run only the smallest failing diagnostic before a full render.

This mirrors `motion-library-adapters`' determinism checks and the
`content-os-keyframes` pose contract for the HTML+GSAP paradigm; the rule set
here is the Remotion-native form.

## Scope boundary

This reference covers the **pose contract** for Remotion keyframes (visible
states + determinism + snapshot verification). Broad scene recipes, brand
design, media sourcing and captions live in the other `references/` files and
in `metodologia-brand-router`; this reference does not duplicate them.
