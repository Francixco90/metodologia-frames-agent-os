# Scene transitions — overview

Transiciones entre clips en una composition multi-scene. CSS-driven, framework-owned,
seekable. El adapter de `content-os-core` scrub el timeline; las transiciones son tweens
absolutos en posiciones de boundary, no CSS `transition` autónoma.

## Contrato

- Una transición es un par de tweens GSAP absolutos en el boundary entre dos clips:
  clip A `{autoAlpha: 1} → {autoAlpha: 0, duration: 0.3}` y clip B
  `{autoAlpha: 0} → {autoAlpha: 1, duration: 0.3}` con un overlap de 0.15s.
- **`autoAlpha`** (GSAP) es la única excepción de visibilidad permitida por `content-os-core`
  — combina `opacity` + `visibility`. Nunca tween `display` o `visibility` raw.
- **Sin CSS `transition`** en los clips — interpolan independientes del seek, flicker.
- **Sin `position: absolute` crossfade sin sized box** — los clips necesitan sized box
  (`width`/`height` en px) o colapsan (ver `content-os-core` root must be sized).
- **z-index por `data-track-index`** — clip posterior en track mayor sobreescribe. Para un
  crossfade, ambos clips en tracks distintos, el entrante en track mayor.

## Patrones

| Transición           | Mecanismo                                                                   | Cuando                    |
| -------------------- | --------------------------------------------------------------------------- | ------------------------- |
| Crossfade            | `autoAlpha` overlap 0.15s                                                   | Default; suave, continuo. |
| Hard cut             | Sin tween; clip B `autoAlpha: 1` en t exacto, clip A `autoAlpha: 0` mismo t | Ritmo percussivo, beat.   |
| Slide-out + slide-in | clip A `x: 0 → x: -100` + clip B `x: 100 → x: 0`, sin overlap               | Spatial, motiva travel.   |
| Scale-dip            | clip A `scale: 1 → 0.9` + autoAlpha, clip B `scale: 1.1 → 1` + autoAlpha    | Énfasis, re-scope.        |

## Stop

Rechazar CSS `transition` en animados, `display`/`visibility` raw tweens, crossfade sin
sized box, y transiciones con `Math.random`/`Date.now` (durations deben ser constantes
authored, no derivadas de reloj).
