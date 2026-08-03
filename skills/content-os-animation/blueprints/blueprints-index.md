# Blueprints Index

Plantillas multi-phase product-agnostic, time-coded. Un blueprint codifica un shot entero
across su duration full — reveals paced al beat, no dumped en t=0. Cada entry apunta a
`blueprints/<id>.md` (recipe full).

## Blueprints disponibles

| Blueprint                          | Duration | Roles             | Signature move                                            |
| ---------------------------------- | -------- | ----------------- | --------------------------------------------------------- |
| `blueprints/brand-reveal.md`       | 4–6s     | Hook, Brand_Outro | Wordmark fade-slide-rise + tagline stagger + settle-scale |
| `blueprints/kinetic-type-beats.md` | 3–8s     | Hook, CTA         | Per-phrase entrances distinctos con spring-pop payoff     |

## Cómo instanciar

1. Pick un blueprint por rol (Hook, Brand_Outro, CTA).
2. Lee `blueprints/<id>.md` para el time-coded shape (`Scene N (a–b s): …` con `[slots]`).
3. Mapea `[slots]` a tu content (headline, tagline, brand mark).
4. Compón las rules atómicas (`rules/`) que el blueprint referencia en una sola timeline
   `paused: true` en `window.__timelines["<id>"]`.
5. Valida con `content-os-core` adapter (render HTML→MP4, double-capture frame 0).

No leas un blueprint speculativamente; cárgalo solo cuando ya decidiste que necesitas
orquestación a nivel escena.
