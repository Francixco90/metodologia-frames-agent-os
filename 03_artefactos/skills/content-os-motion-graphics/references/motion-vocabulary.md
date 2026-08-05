# Motion Vocabulary — Motion Graphics

Shared motion vocabulary. Pairs with `content-os-animation` rules/blueprints +
`content-os-registry` blocks. The builder (Step 4) loads this on-demand.

## Core motions (per category)

| Category     | Signature motion                                   | Catalog block           |
| ------------ | -------------------------------------------------- | ----------------------- |
| kinetic-type | word/letter reveal, scale-punch, wipe              | `caption-*`             |
| stat         | count-up + ring fill                               | `apple-money-count`     |
| charts       | bar/line growth, pie sweep, race advance           | `data-chart`            |
| logo-reveal  | svg-path-draw, scale-in, glow                      | `logo-outro`            |
| lower-thirds | slide-in, fade, hold, slide-out                    | `caption-*` + overlay   |
| maps         | region highlight, connector draw, zoom             | `us-map` / `world-map`  |
| webpage      | scroll, reveal, cursor move, callout               | `caption-*` + UI blocks |
| news         | headline reveal, source card, key-fact callout     | `caption-*` + card      |
| tweet        | card scale-in, text reveal, avatar pop             | `caption-*` + card      |
| asset-fusion | geometry-becomes-chart (diegetic), eyedropper fill | custom + `data-chart`   |

## Determinism + seek-safe (inherited)

- GSAP timelines `paused: true`, registered `window.__timelines[id]`, scrubbed
  via `seek(frame/fps)`.
- No `Date.now()`/`Math.random()`/`new Date()`/`performance.now()`/`fetch`/
  `setTimeout`/`setInterval`/`getBoundingClientRect` in compositions.
- No `repeat: -1`, no relative `+=`, no CSS `transition:` on animated elements.
- Finite repeats (≤2), stagger cap ≤0.5s, transform aliases only.

## Count-up (stat)

Count-up must be deterministic: scrub the counter value from `start` to `end`
over the beat duration. Use a tween on a plain object `{value: 0}` and update
the text node in `onUpdate` (no `Math.random`). Snap to final value at end.

## svg-path-draw (logo-reveal)

`stroke-dasharray` + `stroke-dashoffset` tween from full to 0 (draw on). Then
fill fade-in. Deterministic, seek-safe. User logo SVG is the asset.

## Region highlight (maps)

Highlight regions via `fill` tween (base → accent). Connectors via
`stroke-dashoffset` draw. Zoom via `scale` tween on the map group. No
panning-with-getBoundingClientRect; use transform on the group.

## Asset-fusion (diegetic)

The real image's geometry becomes the chart. Eyedropper palette from the
image (sampled colors → chart fills). `element_positions` map image features to
chart anchors. The asset is not "decorated" — it IS the chart.

## Overlay vs MP4

- MP4 (`overlay: false`): solid background, full piece.
- Transparent overlay (`overlay: true`): `.webm`/`.mov` with alpha. No
  background; the motion graphic composites over another video.
