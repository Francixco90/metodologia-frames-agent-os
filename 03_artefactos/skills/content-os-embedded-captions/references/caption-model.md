# Caption Model — rail + embed

Gobierna cómo una frase promovida se sienta DENTRO de la escena. Leer antes de
authoring cualquier embed.

## Caption model

|         | Qué                                       | Cómo se muestra                                                                                |
| ------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `drop`  | filler — um/uh, tartamudeos, correcciones | no se muestra                                                                                  |
| `rail`  | default — contenido hablado (verbatim)    | lower-third subtitle, **en frente**, legible. Punch word puede tener `emphasis` inline.        |
| `embed` | pico promovido — el headline beat         | una palabra grande compuesta **detrás del sujeto** (matte occlusion), entrada + exit diseñados |

**El rail lleva la mayoría del texto; embed es el pico escaso, ganado.**

## Rail track (thin spec)

Lower-third subtitle, en frente, legible. WCAG contrast. Cada caption ≥ 0.5s.
Word timings match transcript within 80ms. Punch word puede tener `emphasis`
(accent colour / active-word pop) — stays on rail, no embed promotion.

## Embed track (composition craft)

- **Planes & clean-zone anchoring.** Narration planes en `zones.hugLeft`/`hugRight`
  (strips abutting silhouette). Hero en `heroAnchor`/`heroBands.best` (centered
  ON subject, ~30-55% occluded). Far corners = fallback, no default.
- **Zone coherence.** Una columna/banda coherente, no fragmentos scatter.
- **Climax pop & readability.** Hero BIG, visibly behind subject. `recommendation:
fg` mueve NARRATION al frente; hero stays embedded whenever `heroBands.feasible`.
- **Edge-breathing.** Margins breathing, nothing clipped.
- **Occlusion 3-step judgement.** (1) hero band feasible? (2) hero anchor clear
  of leaked furniture? (3) hero embedded behind subject ~30-55%?
- **Accumulation/persistence.** co-visible captions dim (setup) → per-letter
  entrance amplitude ∝ spoken loudness (impact) → breathe + glow until exit.

## Scarcity (per beat/block, no per clip)

≤1 hero per block (thought), nunca dos co-visibles, ≥ un beat de aire entre hero
windows (compiler warns under 0.6s). Short clip → 1-2 heroes; long explainer →
~one per section. Entre multiple heroes, el **largest authored = APEX** (full
lockup embed + width-fit raise); menores = MINOR peaks (oversized emphasis lines,
fg, damped motion). Embedding every word = `embed-overuse` violación.

## Composite layer order

`footage frame → embed caption → matte (subject) → rail caption (front)`

Matte = subject segmentation via `content-os-media` (u2net offline default /
remote opt-in auth-gated). Matte deja al sujeto ocultar embed tracks. NEVER
assume matte clean: sample `frames_fg/` at 2-3 timestamps antes de placing hero;
prefer hero positions clear of leaked furniture.

## Group windows

`group.in ≤ min(word.start)` y `group.out ≥ max(word.end)` para every group. Si
`group.in` es later que un word's start, el word se retrasa silenciosamente
(hemos shippeado 800ms lag bugs). Validator enforces.

## No overlap time+region

Dos caption groups no pueden overlap en time AND screen region. Options:
(a) spatial separation (default, non-overlapping vertical bands), (b) handoff
(earlier group `out` ≤ next group `in`), (c) deliberate layered (`allow_overlap:
true`). Pick (a) by default.

## Never grade footage

`graded-footage` violación si: grade/recolor/scanline/duotone/darken/vignette el
a-roll. neon-noir/CRT texture belongs INSIDE a caption element, no over whole
frame. Footage ships untouched.
