# Navigation — Fragments, Hotspots, Branching, Presenter Mode

## Fragments — reveal hold-points

A fragment is an absolute composition-timeline time (seconds) within the
slide's `[start, end]` where the controller holds a reveal state.

- Player enters a slide at `fragments[0]` and holds.
- Next → seek `fragments[1]`.
- After the last fragment, Next advances to the next slide.
- Slide with no fragments enters a rest frame (midpoint, not exactly
  `slide.end`).
- Fragment times must be within `[start, end]`.
- Navigation is **seek-driven, not play-driven**. GSAP `paused: true`, scrubbed
  via `tl.seek(frame/fps)`. No `repeat: -1`, no relative `+=`.

```js
window.__timelines[sceneId] = gsap.timeline({paused: true});
// fragment entrances at absolute times
window.__timelines[sceneId].fromTo('.frag-1', {autoAlpha: 0, y: 20}, {autoAlpha: 1, y: 0}, 0.3);
window.__timelines[sceneId].fromTo('.frag-2', {autoAlpha: 0, y: 20}, {autoAlpha: 1, y: 0}, 1.2);
```

## Branching — hotspots + slide sequences

Branch slides are real scenes in the same composition timeline. Listed only in
`slideSequences`, excluded from main-line navigation.

- Click hotspot → push `{sequenceId, slideIndex: 0}` onto nav stack → enter
  branch's first slide.
- `back()` pops stack → returns to parent slide.
- `backToMain()` clears stack → root slide.
- Breadcrumb rendered from stack.
- Do NOT add branch scene IDs to main `slides[]` (lint flags overlap).

## Stacked scene frames

Multiple scenes share the composition timeline. Hidden slides must be both
visually hidden and event-gated:

```css
.scene {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}
.scene.is-active {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}
```

The controller toggles `is-active` on seek. No CSS `transition:` on animated
elements (seek-safe; motion lives in GSAP).

## Presenter mode

- Speaker notes (per-slide, from JSON island `notes`) shown in a presenter pane.
- Notes are presenter-only text — editable, stored in `localStorage`. Not TTS,
  not narration, not rendered.
- Keyboard: ← → for slide/fragment navigation, `B` for back, `Home` for
  backToMain.
- Touch swipe supported for tablet presenting.

## Determinism contract (inherits content-os-core)

- No `Date.now()`/`Math.random()`/`new Date()`/`performance.now()` in
  compositions.
- No `fetch`/`setTimeout`/`setInterval` in compositions.
- No `getBoundingClientRect` (layout-dependent).
- Same deck intent + same design + same scenes → same deck.
