# Design Discipline — Before HTML

Resolve the design source in this order: `frame.md` → `design.md` →
`DESIGN.md`. Treat the first file found as brand truth.

## Without a design spec

When no design spec exists, complete all four items before writing composition
HTML:

1. **Ground the visual identity.** Read `content-os-creative` house-style +
   video-composition. Name the concept angle in one sentence for every
   non-trivial creation.
2. **Choose an embeddable font pairing.** From `content-os-creative`
   typography. Do not assume an unbundled display font exists in cloud
   rendering — system fonts, concrete render-safe stacks, no Google Fonts CDN.
3. **Define the focal element.** What the eye lands on first.
4. **Define edge anchors, supporting detail, and background treatment.** Where
   the eye rests, what supports the focal, what sits behind.

## Match density to format

Match density to the requested format and message. Density examples are
guidance for produced frames, not permission to invent claims, scenes, or a
fixed number of elements.

## Named styles / moods

For a named style or mood, read `content-os-creative` visual-styles. When the
user needs to choose visually and no shipped preset fits, read
`content-os-creative` design-picker and run the interactive design selection
there.

## Design adherence

When a design spec exists, before final approval, review against
`content-os-creative` design-adherence. The spec is brand truth; the build must
honor it.

## Preserve the composition contract

- Timed elements use `class="clip"`.
- The root and relevant ancestors are sized.
- Each composition registers one paused, seek-safe timeline on
  `window.__timelines`.
- Rendering is deterministic.
- No render-time network fetches, clocks, or unseeded randomness.
