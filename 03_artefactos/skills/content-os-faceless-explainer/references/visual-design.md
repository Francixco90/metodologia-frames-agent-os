# Visual design — faceless explainer

Método para inventar visuals por frame. Faceless = todo visual inventado
(typography, abstract graphics, diagrams, data-viz). No captured assets.

## Time-coded shot sequence

Cada frame lleva una **time-coded shot sequence** en `STORYBOARD.md`. Una
secuencia = lista de Scenes con reveal paced a VO. No front-load (todo al
principio, freeze después); desarrolla el frame a lo largo de su duración.

Estructura por frame:

```
## Frame NN-<id> (<duration>s)
- Scene 0 (0.0-1.5s): <reveal> — focal: <invented element>
- Scene 1 (1.5-3.5s): <reveal> — focal: <invented element>
- ...
```

## Invented visual elements

`focal`/`roles` nombran **invented visual elements**, no captured assets:

- Hero word (typography grande que anima)
- Diagram node (nodo de un diagrama que se construye)
- Data-viz series (bar/line que crece)
- Abstract shape (forma que morpha)
- Icon (ícono vectorial inline)

El Step 5 worker builda cada invented element en HTML+GSAP (seek-safe).

## Layout vocabulary

State layout **inline** per Scene:

- `full-bleed` — cubre canvas
- `centered` — centro, mucho aire
- `split` — dos zonas (izq/der o top/bottom)
- `stack` — vertical apilado
- `grid` — grilla de celdas
- `inset` — elemento pequeño en zone

## Motion (delegate)

Motion vocabulary + doctrine → `content-os-animation` motion-language +
blueprints-index. No inventes motion names. Pick blueprint por role, instancia
con content de este frame. Pose contract → `content-os-keyframes`.

## Video direction

Un bloque `## Video direction` video-wide: paleta, tipo, mood, transiciones
globales. Source of truth para Step 5 workers.

## No asset-staging

Faceless = no asset-staging. No `asset_candidates` (vacío por default). No
`capture/assets/`. Excepción: si user dio real `public/<basename>` image,
referencia por path en `focal`/`roles`.

## Delegación

- Color/type/layout feel → `content-os-creative` `frame.md`
- Shot shapes (blueprints) → `content-os-animation` blueprints-index
- Motion rules → `content-os-animation` rules-index
- Pose/keyframe lint → `content-os-keyframes`
- Reusable blocks → `content-os-registry`

Este doc es el delta faceless: invented visual method + time-coded shot sequence.
No dupliques capability rules.
