# Pose Mechanism Reference

Use after `SKILL.md` when choosing a concrete implementation mechanism. Parts shelf,
not style guide. Start with one primary mechanism; add supporting motion only when it
clarifies the idea. Offline-first: no external paywall plugins (MotionPathPlugin,
MorphSVGPlugin, SplitText, DrawSVGPlugin).

## Runtime Skeletons

GSAP (default, seek-safe):

```js
const root = document.querySelector('[data-composition-id]');
const id = root.dataset.compositionId;
const tl = gsap.timeline({paused: true});
tl.to('<selector>', {
  keyframes: [/* derive poses from the scene geometry + duration */],
  ease: 'none',
});
window.__timelines = window.__timelines || {};
window.__timelines[id] = tl;
```

CSS keyframes (finite, fill both):

```css
.<subject > {
  animation: <name> <duration> <ease> both;
  animation-iteration-count: 1;
}
@keyframes <name> {
  0% {
    transform: <pose-a>;
    opacity: <a>;
  }
  100% {
    transform: <pose-b>;
    opacity: <b>;
  }
}
```

## Mechanisms

| Mechanism           | Solves                                     | Keyframe                                                        | Runtime (offline)                          | Verify                                      |
| ------------------- | ------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------- |
| Path travel         | Subject follows a visible route            | path progress, tangent rotation, follower offset, trail opacity | GSAP sampled x/y/z (no MotionPathPlugin)   | pose-lint; final snapshot                   |
| Stroke draw         | Line/ring/outline appears over time        | dash/draw range, stroke opacity, endpoint state                 | SVG `stroke-dasharray`/`stroke-dashoffset` | partial mid snapshot; complete final        |
| Shape interpolation | One silhouette becomes another             | source path, middle path, target path, fill/stroke              | path tween (no MorphSVGPlugin)             | first/mid/final snapshots                   |
| Shared element      | Same subject changes box/hierarchy         | source box, target box, x/y, scale, context opacity             | GSAP manual FLIP                           | one identity moves; no substitute crossfade |
| Clip/mask reveal    | Animated boundary exposes content          | clip path, mask position/size, edge softness                    | CSS `clip-path`, SVG mask                  | snapshot edge frames + final unclipped      |
| Ordered repetition  | Many items enter/leave/transform in order  | indexed delay, x/y, scale, opacity, final alignment             | GSAP stagger                               | check first/middle/last item timing         |
| Text subdivision    | Text motion needs readable internal timing | line/word/char/band wrappers, y/x, opacity, final fit           | authored spans (no SplitText paywall)      | strip shot + final readability snapshot     |
| Surface transform   | Image/card stretches/crops/changes shape   | parent scale/skew/clip, child counter-scale, origin             | GSAP + CSS vars                            | no accidental warped final                  |
| UI state machine    | Interface passes through semantic states   | closed, active, loading, success/error, final                   | GSAP labels                                | snapshots hit states in order               |
| DOM depth           | HTML elements need 3D separation           | perspective, z, rotationX/Y, opacity, crossing layer order      | CSS 3D + GSAP                              | angled proof; overlap snapshot              |

## Source Links (offline-first docs)

- GSAP keyframes: https://gsap.com/resources/keyframes/
- GSAP timeline: https://gsap.com/docs/v3/GSAP/Timeline/
- GSAP CSSPlugin: https://gsap.com/docs/v3/GSAP/CorePlugins/CSS/
- MDN CSS animations: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_animations/Using_CSS_animations
- MDN `@keyframes`: https://developer.mozilla.org/en-US/docs/Web/CSS/@keyframes
- MDN `clip-path`: https://developer.mozilla.org/en-US/docs/Web/CSS/clip-path
- MDN CSS masking: https://developer.mozilla.org/en-US/docs/Web/CSS/mask
- MDN perspective: https://developer.mozilla.org/en-US/docs/Web/CSS/perspective
- MDN transform-style: https://developer.mozilla.org/en-US/docs/Web/CSS/transform-style

External paywall plugins (MotionPathPlugin, MorphSVGPlugin, DrawSVGPlugin, SplitText,
Flip) are out-of-scope offline-first. Use the offline fallbacks listed above.
