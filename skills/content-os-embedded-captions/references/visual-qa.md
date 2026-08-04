# Visual QA — preview BEFORE you render

Preview frames: composite caption layers at seek-time + real video frame + matte
occlusion + rail overlay = faithful preview (~2s/frame, no render). Default
samples = each group/climax window. Full render costs minutes — never use it to
discover layout problems.

## Failure list (geometric gates cannot catch these)

1. **Washout** — light text over bright region (window/sign/sky): unreadable →
   move plane or change identity (bright scene → `ink`).
2. **Text-on-text** — captions over scene's own text/graphics, o two caption
   groups colliding.
3. **Reading order** — on-screen vertical order must match spoken order; hero
   must not sit below later words.
4. **Hero presence** — climax BIG and visibly behind subject (~30-55% occluded),
   not floating label in margin.
5. **Balance** — one coherent column/band, not scattered fragments; margins
   breathing; nothing clipped.

## 5 positive checks (what makes it designed)

1. **Poster test** — freeze any frame: does it read as a composed poster?
2. **Timid test** — is anything too small/timid that should be bolder?
3. **One-glance hierarchy** — does the eye find the hero in one glance?
4. **Scene handshake** — do captions feel OF the scene (embedded) or pasted ON?
5. **Dead-air audit** — any dead frames with no caption where speech is active?

Ship when both failure list + positive list pass.

## Fresh-eyes review (recommended)

Confirmation bias about your own layout. Spawn a subagent: give it ONLY the
preview sheet + this checklist, ask PASS/FIX verdicts per frame. Apply fixes in
plan.json / theme.json, recompile, re-preview — each loop costs seconds. Render
once, when previews pass.

## Gates (enforced before render)

- **Timing** — word timings match transcript within 80ms. `check-timing` strict.
  Never pack multiple transcript words into one entry (second word inherits
  first's timestamp, fires early). Split into separate word entries.
- **Occlusion+hero** — face ≥30% uncovered per 0.3s window. Face never 100%
  covered continuously.
- **Overflow** — captions stay on-frame. Intentional bleed única excepción.
- **Contrast** — WCAG. Fix palette si falla.
- **Hand-off** — no two groups overlap in time AND screen region (spatial
  separation default, handoff, o `allow_overlap`).
