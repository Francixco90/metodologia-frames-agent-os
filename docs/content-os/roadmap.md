# Frames ContentOS — roadmap

> Secuencia de PRs para Fases 2-4 + programa multi-vendor. Cada skill = un PR (o
> batch 2-3 cuando acoplamiento bajo). Aprobación por fase. Dependencies resueltas
> antes de desbloquear dependientes. Estado a 2026-08-04. [DOC]

## Fase 2 — capability skills (HTML+GSAP runtime + 7 layers)

Orden por dependencia. `content-os-core` primero (define contrato HTML + render
adapter); los demás dependen de él.

| orden | PR                                                                               | skill                  | depende de | registro                  |
| ----- | -------------------------------------------------------------------------------- | ---------------------- | ---------- | ------------------------- |
| 2a    | `feat(content-os): core — HTML composition contract + Playwright render adapter` | `content-os-core`      | —          | creation-v3               |
| 2b    | `feat(content-os): animation — GSAP rules/blueprints/transitions`                | `content-os-animation` | 2a         | creation-v3               |
| 2c    | `feat(content-os): keyframes — pose contract + lint/check/snapshot`              | `content-os-keyframes` | 2a         | creation-v3               |
| 2d    | `feat(content-os): creative — brand/pacing/narration (delegates brand-router)`   | `content-os-creative`  | 2a         | skill-registry v2 (brand) |
| 2e    | `feat(content-os): media — dual offline + remote-opt-in media OS`                | `content-os-media`     | 2a         | creation-v3               |
| 2f    | `feat(content-os): registry — reusable HTML blocks registry`                     | `content-os-registry`  | 2a         | creation-v3               |
| 2g    | `feat(content-os): router — intent router source→video (extends Capa A)`         | `content-os-router`    | 2a, 2b, 2e | creation-v3               |

**Estado**: completado. 7 skills registradas, `pnpm verify:skills` verde, adapter
HTML→MP4 renderiza fixture de prueba (faceless 10s) determinístico. [CONFIG]

## Fase 3 — deliverable workflows source→video (8 PRs)

Orden prioridad (más útil para MetodologIA primero). Cada workflow delega a
capability skills (Fase 2) + `content-os-media`.

| orden | PR                                                                   | skill                             | input      | depende de           |
| ----- | -------------------------------------------------------------------- | --------------------------------- | ---------- | -------------------- |
| 3a    | `feat(content-os): faceless-explainer — text→video`                  | `content-os-faceless-explainer`   | texto      | 2b, 2d, 2e, 2g       |
| 3b    | `feat(content-os): pr-to-video — GitHub PR→video (auth-gated fetch)` | `content-os-pr-to-video`          | PR URL/num | 2b, 2d, 2e, 2g       |
| 3c    | `feat(content-os): website-to-video — URL→video`                     | `content-os-website-to-video`     | URL        | 2b, 2d, 2e, 2g       |
| 3d    | `feat(content-os): product-launch-video`                             | `content-os-product-launch-video` | brief      | 2b, 2d, 2e, 2g       |
| 3e    | `feat(content-os): motion-graphics — short unnarrated`               | `content-os-motion-graphics`      | brief      | 2b, 2g               |
| 3f    | `feat(content-os): embedded-captions`                                | `content-os-embedded-captions`    | video+text | 2b, 2e, 2g           |
| 3g    | `feat(content-os): slideshow — navigable deck`                       | `content-os-slideshow`            | contenido  | 2b, 2g               |
| 3h    | `feat(content-os): general-video — router general`                   | `content-os-general-video`        | mixto      | 2g + workflows 3a-3g |

**Estado**: completado (los 17 originales pre-programa existen y están activos).
`content-os-faceless-explainer` + `content-os-pr-to-video` son los validadores de
campo (más uso real MetodologIA). [DOC]

## Fase 4 — bridge + hardening (multi-PR)

| orden | PR                                                                                     | scope                                                                   |
| ----- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 4a    | `feat(content-os): remotion-bridge — bidirectional Remotion↔HTML (SSIM-graded)`        | `content-os-remotion-bridge` skill                                      |
| 4b    | `feat(content-os): harden remotion-video-production — keyframe pose contract`          | extiende skill existente                                                |
| 4c    | `feat(content-os): harden motion-library-adapters — media-use adapter pattern`         | extiende skill existente                                                |
| 4d    | `feat(content-os): CI expansion — verify:content-os validator + workflow`              | `.github/workflows/validate.yml` + `scripts/check-content-os-skills.ts` |
| 4e    | `feat(content-os): union index — registries/skills/README.md + Frames ContentOS entry` | doc                                                                     |

**Estado**: `content-os-remotion-bridge` (4a) existe (activo). Hardening (4b-4c) y
CI expansion (4d-4e) pendientes. [DOC]

## Fase 2A — HyperFrames homólogos (batches 1-3 merged)

9 homólogos adicionales `content-os-*` derivados de skills Fase 1A vendored.
Batched 3 skills por PR.

| batch | PR  | skills                                                                                     | estado |
| ----- | --- | ------------------------------------------------------------------------------------------ | ------ |
| 1     | #35 | `content-os-talking-head-recut`, `content-os-music-to-video`, `content-os-changelog-video` | merged |
| 2     | #36 | `content-os-figma`, `content-os-hyperframes-cli`, `content-os-captions-overlay`            | merged |
| 3     | #37 | `content-os-motion-doctrine`, `content-os-cut-the-curve`, `content-os-seam-craft`          | merged |

**Objetivo Fase 2A**: 33 skills HyperFrames homólogos. Batches 1-3 cubren 9
homólogos (active). Batches 4+ pendientes: `oversized-cursor`, `hyperframes-tts`,
`animation-adapter` overlap merge, meta/dev `doc-index`. [DOC]

## Programa multi-vendor (Fases 1-4)

| fase                          | scope                      | estado                                                                  |
| ----------------------------- | -------------------------- | ----------------------------------------------------------------------- |
| Fase 1 vendor                 | 4 publishers vendored      | done — 48 HyperFrames + 11 Remotion + 3 Bento + 3 Scroll reference-only |
| Fase 2A HyperFrames homólogos | 33 skills objetivo         | batches 1-3 done (9 skills, PRs #35/#36/#37); batch 4+ pending          |
| Fase 2B Remotion              | 11 homólogos               | pendiente — 4 PRs batched                                               |
| Fase 2C Bento                 | 3 homólogos                | pendiente — 1 PR                                                        |
| Fase 2D Scroll multi-provider | 3 homólogos v2             | pendiente — 3 PRs                                                       |
| Fase 3 registry reconcile     | reconciliación de registro | pendiente                                                               |
| Fase 4 receipt cascade        | `RCP-DEP-PRODUCTION` regen | solo si `package.json` muta (scroll Fal AI)                             |

## Dependencias críticas

- **2a bloquea todo**: sin contrato HTML + render adapter, nada de Fase 2-3
  funciona. PRIORIDAD MÁXIMA (completado).
- **2e (media) bloquea workflows con TTS/narration**: `faceless-explainer`,
  `product-launch-video`, `embedded-captions` dependen del media OS dual.
- **2g (router) bloquea 3h (general-video)**: el router general despacha a los
  workflows 3a-3g.
- **3a + 3b son los validadores de campo**: si alguno fracasa, pausa Fase 3 y
  re-alinea arquitectura antes de continuar.

## Fuera de scope (programa Frames ContentOS)

- Runtime npm dep (`@hyperframes/engine`) — rechazado (Option B, Puppeteer
  conflict); ver `architecture.md` §2.
- Publicación/distribución — gates G13-G17 manuales, fuera de este programa.

## Estimación por fase

FTE-months + disclaimers (no precios). Ranges orientativos:

- Fase 2 (7 skills + adapter): mayor esfuerzo (adapter Playwright + contrato HTML).
- Fase 3 (8 workflows): medio (cada workflow es orchestrador sobre Fase 2).
- Fase 4 (bridge + hardening): medio (SSIM grading + hardening sin romper hashes).
- Fase 2A-2D (homólogos multi-vendor): medio-bajo por batch (adaptación sobre
  contracts existentes).

Detalles por PR se refinan al iniciar cada fase.
