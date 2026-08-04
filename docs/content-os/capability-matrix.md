# Content OS — capability matrix

> Formaliza el mapeo entre las skills HyperFrames vendored (Fase 0 + Fase 1A) y
> las skills nativas `content-os-*`. Insumo load-bearing para el roadmap. El
> programa se expandió beyond Fase 0: 4 publishers vendored + 26 homólogos H-03
> hash-bound a fecha 2026-08-04. [DOC]

## Leyenda

- **build** — sin equivalente local; skill nueva desde cero (adaptación de vendor).
- **extend** — equivalente local parcial; la skill nativa extiende/refactoriza el existente.
- **partial** — equivalente local cubre un subconjunto; gap documentado.
- **gap** — sin equivalente local; capacidad enteramente nueva.

## Publishers vendored (4 publishers, reference-only)

| publisher                           | skills | licencia / notes                                                                       |
| ----------------------------------- | ------ | -------------------------------------------------------------------------------------- |
| `skills/vendor/hyperframes/`        | 48     | HeyGen HyperFrames (15 Fase 0 + 33 Fase 1A), Apache-2.0                                |
| `skills/vendor/remotion-publisher/` | 11     | Remotion publisher (source-available, Remotion AG, audit)                              |
| `skills/vendor/bento/`              | 3      | Bento (MIT pending verify)                                                             |
| `skills/vendor/scroll-skills/`*     | 3      | scroll (re-vendored a latest; `cinematic-scroll`, `scroll-experience`, `scroll-world`) |

\* El programa de scroll se publica como `docs/scroll-skills/`; las 3 skills
viven en directorios `cinematic-scroll/`, `scroll-experience/`, `scroll-world/`
bajo `skills/vendor/`. [CONFIG]

Los 4 publishers son **reference-only**: no se ejecutan, no se registran, bypass
`verify:skills`. Las skills nativas `content-os-*` se construyen localmente bajo
`LicenseRef-MetodologIA-Internal`. [CONFIG]

## Matriz Fase 0 — 15 HyperFrames → skills nativas (referencia histórica)

Mapeo original Fase 0. El programa Content OS se expandió beyond esta matriz
(ver §“Homólogos H-03” abajo para el estado actual completo). [DOC]

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

## Homólogos H-03 hash-bound — estado actual (26 skills)

26 skills `content-os-*` + afines registradas con `content_sha256` +
`package_manifest_sha256` + 4 lifecycle events en
`registries/skills/creation-v3-skill-registry.yml`, validadas por
`scripts/check-creation-v3-skills.ts`. [CONFIG]

### Originales pre-programa (17)

| skill                             | estado | batch / PR | notas                                           |
| --------------------------------- | ------ | ---------- | ----------------------------------------------- |
| `data-visual-composition`         | active | —          | pre-programa                                    |
| `motion-library-adapters`         | active | —          | pre-programa                                    |
| `content-os-core`                 | active | 2a         | contrato HTML + render adapter                  |
| `content-os-animation`            | active | 2b         | GSAP rules/blueprints                           |
| `content-os-keyframes`            | active | 2c         | pose contract + lint/check/snapshot             |
| `content-os-creative`             | active | 2d         | brand/pacing/narration (delegates brand-router) |
| `content-os-media`                | active | 2e         | dual offline + remote-opt-in media OS           |
| `content-os-registry`             | active | 2f         | reusable HTML blocks registry                   |
| `content-os-router`               | active | 2g         | intent router source→video (extends Capa A)     |
| `content-os-faceless-explainer`   | active | 3          | text→video workflow                             |
| `content-os-pr-to-video`          | active | 3          | GitHub PR→video (auth-gated fetch)              |
| `content-os-product-launch-video` | active | 3          | launch video workflow                           |
| `content-os-motion-graphics`      | active | 3          | short unnarrated motion                         |
| `content-os-embedded-captions`    | active | 3          | caption pipeline                                |
| `content-os-slideshow`            | active | 3          | navigable deck                                  |
| `content-os-general-video`        | active | 3          | general router                                  |
| `content-os-remotion-bridge`      | active | 4          | bidirectional Remotion↔HTML (SSIM-graded)       |

### Fase 2A HyperFrames homólogos (9, batches 1-3, PRs merged)

| skill                           | estado | batch | PR  | origen vendor (Fase 1A)  |
| ------------------------------- | ------ | ----- | --- | ------------------------ |
| `content-os-talking-head-recut` | active | 1     | #35 | `talking-head-recut`     |
| `content-os-music-to-video`     | active | 1     | #35 | `music-to-video`         |
| `content-os-changelog-video`    | active | 1     | #35 | `changelog-video`        |
| `content-os-figma`              | active | 2     | #36 | `figma`                  |
| `content-os-hyperframes-cli`    | active | 2     | #36 | `hyperframes-cli` (meta) |
| `content-os-captions-overlay`   | active | 2     | #36 | `captions-overlay`       |
| `content-os-motion-doctrine`    | active | 3     | #37 | `motion-doctrine`        |
| `content-os-cut-the-curve`      | active | 3     | #37 | `cut-the-curve`          |
| `content-os-seam-craft`         | active | 3     | #37 | `seam-craft`             |

Fase 2A batches 4+ pendientes (oversized-cursor, hyperframes-tts,
animation-adapter overlap merge, meta/dev doc-index) — ver `roadmap.md`. [DOC]

## Resumen

- **26 homólogos H-03 hash-bound** (17 originales + 9 Fase 2A batches 1-3). [CONFIG]
- **9 homólogos nuevos** en Fase 2A batches 1-3 (PRs #35/#36/#37 merged).
- **4 publishers vendored** reference-only: 48 HyperFrames + 11 Remotion + 3 Bento
  - 3 Scroll = 65 skills de referencia (no registradas, bypass `verify:skills`).
- **Matriz Fase 0 (15→locales)** se mantiene como referencia histórica; el programa
  se expandió con Fase 1A (vendor) + Fase 2A (homólogos).

## Cobertura local

13 skills locales originales (pre-Content OS) + 26 homólogos H-03 = 39 skills
nativas registradas. Vendors (`skills/vendor/**`) permanecen reference-only, no
registradas. [CONFIG]
