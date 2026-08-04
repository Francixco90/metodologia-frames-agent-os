# Porting Source Pages → Deck

A slideshow can be built by converting an existing source page (a HyperFrames
composition, a landing page, a scroll experience) into a navigable deck. The
goal is to **preserve** the source's visual design, motion, interactions, and
media behavior while re-framing it as discrete slides with fragments and
branching.

## Preservation rules

1. **Preserve visual design.** Type, color, spacing, brand tokens — reuse
   `content-os-creative` tokens. Do not restyle to "deck defaults".
2. **Preserve motion.** Source GSAP timelines become per-slide timelines.
   Fragment hold-points map to the source's natural reveal beats. Keep
   seek-safe (`paused: true`, seek-driven).
3. **Preserve interactions.** Hover states, clickable elements become hotspots
   where they branch the narrative. Non-branching interactions become fragment
   reveals.
4. **Preserve media behavior.** Images, embedded players, data-viz — keep their
   playback/cycle behavior within the slide's `[start, end]`. Framework-owned
   media only (no external CDN, no network in composition).
5. **Re-frame, don't rebuild.** The source composition is split into slide
   scenes (one `data-composition-id` per slide). The JSON island declares the
   new slide order + fragments + branches.

## Conversion steps

1. **Audit the source.** Identify the natural slide breaks (section boundaries,
   scroll pins, chapter markers). Each becomes a scene.
2. **Assign slide order.** Main line in `slides[]`. Branch-only content in
   `slideSequences[]` (off-line, hotspot-reachable).
3. **Extract fragments.** Map source reveal beats to fragment times within each
   slide's `[start, end]`. Drop beats that don't translate.
4. **Promote interactions to hotspots.** Clickable source elements that branch
   become `SlideHotspot` with `target` → `slideSequence` id.
5. **Write the JSON island.** Single source of truth near top of `<body>`.
6. **Lint + preview.** `content-os-keyframes` lint (sceneId resolves, hotspot
   targets, fragments in range, no main-line overlap). Preview deck navigation.

## Anti-patterns

- **Do not `hyperframes render` the deck.** No master-root composition; render
  truncates to the first slide. Output is the live deck + per-slide snapshot
  stills. `rendered_mp4: true` = `render-mp4` violation.
- **Do not strip the source's identity.** Porting preserves brand; it does not
  flatten to a generic deck template.
- **Do not add narration.** Deck is unnarrated (`vo_mode: silent`). Speaker
  notes are presenter-only.
- **Do not add network.** Ported media must resolve offline (registry cascade).
  No Google Fonts CDN, no external assets in composition.
