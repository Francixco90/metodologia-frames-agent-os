# Content OS — capability matrix

> Formaliza el mapeo entre las 15 skills HyperFrames vendored
> (`skills/vendor/hyperframes/`, Fase 0) y las skills nativas `content-os-*` a
> construir en Fases 2-4. Insumo load-bearing para el roadmap.

## Leyenda

- **build** — sin equivalente local; skill nueva desde cero (adaptación de vendor).
- **extend** — equivalente local parcial; la skill nativa extiende/refactoriza el existente.
- **partial** — equivalente local cubre un subconjunto; gap documentado.
- **gap** — sin equivalente local; capacidad enteramente nueva.

## Matriz

| HyperFrames vendored                             | Equivalente local actual                                               | Tipo    | Skill Content OS                  | Fase |
| ------------------------------------------------ | ---------------------------------------------------------------------- | ------- | --------------------------------- | ---- |
| `hyperframes` (router/intro)                     | `CLAUDE.md` router Capa A (cabina, no source→video)                    | gap     | `content-os-router`               | 2g   |
| `hyperframes-core` (composición HTML + `data-*`) | `remotion-video-production` (React, no HTML)                           | gap     | `content-os-core`                 | 2a   |
| `hyperframes-animation` (GSAP rules/blueprints)  | `motion-library-adapters` (GSAP bajo frame clock Remotion)             | partial | `content-os-animation`            | 2b   |
| `hyperframes-creative` (brand/pacing/narration)  | `metodologia-brand-router` (brand/voice/channel, sin pacing/narration) | partial | `content-os-creative`             | 2d   |
| `hyperframes-keyframes` (pose contract)          | `scripts/check-determinism.ts` (determinism static, sin pose contract) | partial | `content-os-keyframes`            | 2c   |
| `hyperframes-registry` (bloques reusables)       | `registries/skills/*` (registry de skills, no bloques)                 | gap     | `content-os-registry`             | 2f   |
| `media-use` (media OS)                           | offline-only local (sin TTS/transcription/bg-removal)                  | gap     | `content-os-media`                | 2e   |
| `remotion-to-hyperframes` (bridge)               | —                                                                      | gap     | `content-os-remotion-bridge`      | 4    |
| `slideshow` (deck navigable)                     | `instagram-carousel-production` (MP4/carousel, no deck navigable)      | gap     | `content-os-slideshow`            | 3    |
| `embedded-captions`                              | —                                                                      | gap     | `content-os-embedded-captions`    | 3    |
| `pr-to-video`                                    | —                                                                      | gap     | `content-os-pr-to-video`          | 3    |
| `motion-graphics`                                | `motion-library-adapters` (motion primitives, no workflow)             | gap     | `content-os-motion-graphics`      | 3    |
| `product-launch-video`                           | —                                                                      | gap     | `content-os-product-launch-video` | 3    |
| `faceless-explainer`                             | —                                                                      | gap     | `content-os-faceless-explainer`   | 3    |
| `general-video`                                  | —                                                                      | gap     | `content-os-general-video`        | 3    |

## Resumen

- **7 capability layers** (Fase 2): 5 gap + 2 partial. `content-os-animation` y
  `content-os-creative` reusan patrones de `motion-library-adapters` y
  `metodologia-brand-router` respectivamente (no duplican, coexisten).
- **8 deliverable workflows** (Fase 3): 8 gap. Todos delegan design/motion a
  capability skills (Fase 2) y media a `content-os-media` (Fase 2e).
- **1 bridge** (Fase 4): gap. Bidirectional Remotion↔HTML, SSIM-graded.

## Cobertura local post-Fases 2-4

13 skills locales actuales + 16 skills `content-os-*` nuevas (7 capability + 8
workflow + 1 bridge) = 29 skills nativas. Vendors (`skills/vendor/hyperframes/`)
permanecen reference-only, no registrados.
