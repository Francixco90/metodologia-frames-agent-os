# Rules Index

Recetas de motion atómicas. Cada una vive en `rules/<name>.md`. Compón 2-4 por escena con
una sola `gsap.timeline({paused: true})`.

## El contrato — cada rule asume esto

Stateado una vez aquí para que las rules individuales no repitan. Cada recipe en `rules/`:

- corre en UNA timeline **paused** registrada en `window.__timelines` (nunca autoplay, nunca
  segunda timeline);
- es **seek-safe bidireccional**: `fromTo` con from-states explícitos (t=0 correcto bajo
  seek; `immediateRender: false` al re-own un target), valores absolutos — nunca `+=`/`-=`;
  estado legible como función pura de timeline time, sin mutable trackers;
- es **determinista**: no `Math.random()`, no `Date.now()` — pseudo-random derivado de índice
  y schedules baked solo; repeats finitos, nunca `repeat: -1`;
- anima **transforms y paint-only properties** — `width`/`height`/`top`/`left` tweens
  prohibidos (usar scale/translate proxies, masks, o `anchored-layout-expand`);
- cap staggers de grupo para que un arrival lea como un beat (`items × stagger ≤ ~0.5s`);
- pone **sin CSS `transition`** en elementos animados (interpolan independientes del seek,
  flicker) y hint compositors con `will-change: transform` donde muchos tweens corren;
- mide DOM (`offsetHeight`, `getBoundingClientRect`) solo en build time en una composición
  **single-scene** — en un montage multi-scene, clips posteriores pueden no estar laid out:
  usar constantes CSS-matched authored;
- vive dentro de un scene clip standard per `content-os-core` (`class="clip"` + `data-*`
  timing) — los snippets muestran mecanismo DOM solo, no el scaffold de escena.

La sección **Critical Constraints** de una rule lista solo lo ESPECÍFICO a esa rule más allá
de este contrato.

## Reglas disponibles

| Rule                           | Trigger                                             | Tags                               |
| ------------------------------ | --------------------------------------------------- | ---------------------------------- |
| `rules/fade-slide-rise.md`     | Entrada de título/hero con fade + slide vertical    | text, fade, slide, reveal, hero    |
| `rules/kinetic-type-beats.md`  | Tagline rítmico con per-phrase entrances distinctos | text, kinetic, beat, slam, punchy  |
| `rules/stat-bars-and-fills.md` | Data-viz: growth bars, progress fill, star-rating   | data, stats, bars, progress, chart |

Carga una rule solo cuando ya decidiste cuál necesitas (no leas speculativamente).
