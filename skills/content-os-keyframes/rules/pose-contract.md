# Pose Contract — ground truth rule

A keyframe pose contract declares the moving subject, the explicit poses that prove the
intended motion, the final state, and a seek-safe runtime. Verified by `pose-lint.mjs`
and snapshots, not by logs.

## Contract

1. **Name the moving subject.** One subject = one selector + `data-keyframe-subject`.
2. **Name the poses needed** to prove the intended motion, including the final state.
   Mark each pose: `data-pose="<name>" data-at="<seconds>"`.
3. **Keyframe visible channels**, not hidden helper state. Compositor channels
   (`x/y/z`, `scale`, `rotation`, `opacity`, `autoAlpha`, `clip-path`, SVG dash) over
   layout channels (`top/left`, `width/height`, `display`).
4. **Preserve object identity** when continuity matters. One subject lives across the
   whole tramo; do not replace it with a crossfade unless the intended motion is
   replacement or dissolve (mark `data-crossfade="replacement"`).
5. **Crossfade only when** the intended motion is replacement or dissolve.
6. **Hold readable or semantic states** long enough to see. Proof pose > 200ms.
7. **Final frame is part of the animation**, not cleanup. Do not reset to rest, do not
   end on black, unless explicitly requested.
8. **Finite repeats.** Stagger cap <= 0.5s (inherits `content-os-animation`).

## Example (ground truth)

```html
<div
  id="cos-pose-demo"
  data-composition-id="cos-pose-demo"
  data-keyframe-subject="#mover"
  data-final-state="settled"
  data-width="1280"
  data-height="720"
  data-duration="4"
  data-start="0"
>
  <div class="clip" data-start="0" data-duration="4" data-track-index="0">
    <div
      id="mover"
      data-pose="start"
      data-at="0"
      data-pose="peak"
      data-at="1.2"
      data-pose="settle"
      data-at="2.4"
      data-final-state="settled"
    >
      mover
    </div>
  </div>
</div>
<script>
  window.__timelines = window.__timelines || {};
  window.__timelines['cos-pose-demo'] = gsap.timeline({paused: true});
  const tl = window.__timelines['cos-pose-demo'];
  // 3 explicit poses + final hold: fromTo absolute from-states, finite repeats only
  tl.fromTo(
    '#mover',
    {opacity: 0, x: -200},
    {opacity: 1, x: 0, duration: 1.2, ease: 'power2.out'},
    0,
  );
  tl.fromTo('#mover', {scale: 1}, {scale: 1.15, duration: 0.6, ease: 'sine.inOut'}, 1.2);
  tl.fromTo('#mover', {scale: 1.15}, {scale: 1, duration: 0.6, ease: 'sine.inOut'}, 1.8);
  tl.set('#mover', {autoAlpha: 1}, 2.4);
</script>
```

## Snapshot

Capture frames at proof times via the `content-os-core` render adapter (HTML→PNG→FFmpeg):

- **first** (t=0): initial readable state.
- **proof** (each `data-at`): peak proof of the mechanism.
- **final-minus-hold**: just before the final hold.
- **exact-final**: final lockup state.

Compare snapshots against the declared pose contract. Trust painted pixels over logs.

## Failure modes

| Failure         | Fix                                                                            |
| --------------- | ------------------------------------------------------------------------------ |
| endpoint-only   | add middle poses, hold peak proof, re-lint                                     |
| identity-break  | keep one element alive, shared source/final boxes, remove substitute crossfade |
| fake-3D         | add z/camera travel, occlusion, angled proof                                   |
| wrong-final     | add final hold, snapshot final-minus-hold and exact final                      |
| unseekable      | pause autoplay, register instance, remove timers, build synchronously          |
| unreadable-text | preserve line boxes, reduce displacement, add final hold, snapshot text frames |

`RENDERED_DRAFT` != `HUMAN_APPROVED` != `READY` != `PUBLISHED`.
