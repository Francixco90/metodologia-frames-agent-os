# Visual design — PR to video

Método para inventar visuals por frame + tratar code beats. PR video es **mostly
invented** (typography, number-lockups, mechanism diagrams) con dos excepciones:
**code beats** (ready-made `code-*` registry block) y **credits close** (real
contributor avatars). No captured assets beyond avatars.

## Time-coded shot sequence

Cada frame lleva una **time-coded shot sequence** en `STORYBOARD.md`. Una
secuencia = lista de Scenes con reveal paced a VO. No front-load (todo al
principio, freeze después); desarrolla el frame a lo largo de su duración. El
development often IS the reveal — el diff hunk typing in, el before→after morph,
el request-retry diagram running, el impact stat landing. Let the build be the
message.

Estructura por frame:

```
## Frame NN-<id> (<duration>s)
- Scene 0 (0.0-1.5s): <reveal> — focal: <invented element | code-* block>
- Scene 1 (1.5-3.5s): <reveal> — focal: <invented element | code-* block>
- ...
```

End on a held read. Prefer stillness to bad motion. Solo el final frame tiene
real exit; every other frame's exit es el harness transition (`transition_in`).

## Code beats

Para un code beat, el `code-*` block es el frame's `focal`. Las Scenes
choreograph el surrounding code-editorial Code Surface (entry del file/header,
camera onto el hunk, landing line) — **not** la code animation itself, que el
block owns. Inmediatamente después de cada code frame's fields, add un
`### Source excerpt` fenced `diff` block con solo el exact real hunk que el
worker debe render (12 líneas max). Selecciónalo aquí de `capture/diff.patch`;
workers forbidden de reopen el full diff.

## Invented visual elements (non-code beats)

`focal`/`roles` nombran **invented visual elements** para non-code beats:

- Hero word / number-lockup (typography grande que anima)
- Mechanism diagram (nodes/arrows que se construyen, muestra behavior)
- Impact stat (stat que lands)
- File chip (chip de filename que aparece)
- Abstract shape (forma que morpha)

El Step 5 worker builda cada invented element en HTML+GSAP (seek-safe).

## Layout vocabulary

State layout **inline** per Scene:

- `full-bleed` — cubre canvas
- `centered` — centro, mucho aire
- `split` — dos zonas (izq/der o top/bottom)
- `stack` — vertical apilado
- `grid` — grilla de celdas
- `inset` — elemento pequeño en zone
- `code-surface` — navy code surface (code beats)

## Motion (delegate)

Motion vocabulary + doctrine → `content-os-animation` motion-language +
blueprints-index. No inventes motion names. Pick blueprint por role, instancia
con content de este frame. Pose contract → `content-os-keyframes`. Code block
animation → `content-os-registry` `code-vocabulary.md`.

## Video direction

Un bloque `## Video direction` video-wide: paleta (code-editorial), tipo, mood,
transiciones globales. Source of truth para Step 5 workers.

## Credits close

Real contributor avatars (`assets/<login>.png`, 1-6). Único frame con real
assets. Stage desde `assets/` via assembler backstop.

## Delegación

- Color/type/layout feel → `content-os-creative` `frame.md` (code-editorial
  preset)
- Shot shapes (blueprints) → `content-os-animation` blueprints-index
- Motion rules → `content-os-animation` rules-index
- Pose/keyframe lint → `content-os-keyframes`
- `code-*` blocks → `content-os-registry` `code-vocabulary.md`

Este doc es el delta pr-to-video: code-beat treatment + invented visual method +
time-coded shot sequence + credits. No dupliques capability rules.
