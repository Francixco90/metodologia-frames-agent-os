# Identity Catalog — Content OS Embedded Captions

Single source of truth for routing. El user elige UNA identity; engine, compiler
y authoring file se derivan por lookup. **Nunca surfaces "Standard vs Cinematic vs
Theme" como pregunta** — son backend names.

## DNA registry (10 scene-parameterized visual languages)

| DNA           | Register       | Scene fit                                       | Voice                                                                  |
| ------------- | -------------- | ----------------------------------------------- | ---------------------------------------------------------------------- |
| `cream`       | premium-warm   | dark/mid warm scenes                            | Inter + warm cream + screen; glowing emergence hero                    |
| `ink`         | premium        | **bright scenes (luma > 150)**                  | near-black multiply — type printed ON the wall; bright-scene answer    |
| `editorial`   | editorial-luxe | introspective / fashion / poetic                | Bodoni Moda, lowercase-italic hero — magazine elegance                 |
| `keynote`     | tech-premium   | product / launch                                | opaque white Inter 800, dead-center stillness                          |
| `documentary` | formal         | interview / serious                             | burn-in reveals, no hero — gravitas IS the style                       |
| `loud`        | loud           | hype / sport / social                           | Anton + scene-sampled accent, single-unit slam + ripple; body in front |
| `neon`        | loud-neon      | neon-noir / nightlife / tech-noir (dark scenes) | electric-cyan signage, ignition flicker, hero powers ON like a sign    |
| `glitch`      | loud-neon      | digital / hacker / AI                           | RGB-split echoes snap together on landing; machine-percussive timing   |
| `chrome`      | loud-luxe      | Y2K / fashion-tech / music                      | liquid-metal gradient hero + one sheen sweep during the hold           |
| `velocity`    | loud-sport     | sport / auto / fitness                          | every word arrives along its motion vector (streak+skew), speed trails |

Pick by `safe-zones.json` (`heroAnchor.bandLuma`, `palette.temperature`) × content
register. Bright hero band luma > 150 wants `ink`. Unsure → `anchor` (theme) o
`cream` (DNA).

## Themes (themed constitutions)

`anchor` (rail-surface, words read, scene safe — DEFAULT when unsure), `ordnance`
(explosive), `terminal` (CRT/CLI), `neonsign` (electric signage), `stardust`
(premium-warm sparkle), `stomp` (impact slam). Cada theme = body paradigm × hero
setpiece × front fx × plate reaction, composed from registries.

## Shortlisting heuristics (identity-level, not category-level)

- "炸 / 特效 / VFX" → ordnance/stomp/terminal/loud (pick by WHAT should explode)
- explainer / interview / must-read words → rail/panel-surface (anchor, cream,
  documentary, keynote)
- poetic / social / "cinematic" → column-flow (editorial, cream)
- bright scene → ink (letterpress built for bright surfaces)
- neon-noir / nightlife → neon
- digital / hacker / AI → glitch
- Y2K / fashion-tech → chrome
- sport / auto / fitness → velocity

## Aesthetic decision (input to shortlist, NOT a second router)

Classify el clip en 3 axes y feed into shortlisting:

- **Tone**: documentary | conversational | energetic | poetic | keynote | investigative | music-video
- **Shot**: close-up | mid-shot | wide | cut-montage
- **Platform**: 9:16 portrait | 16:9 landscape | 1:1 square | broadcast

Esta matrix informa el shortlist; el catálogo es la única routing surface.
