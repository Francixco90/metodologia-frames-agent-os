---
name: content-os-router
description: This skill should be used when the user asks to "make a video from a URL", "turn a GitHub PR into a video", "explain a topic with a faceless video", "route a source to a Content OS workflow", "pick the right Content OS workflow for a source", or "dispatch capabilities for a source-to-video deliverable".
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires the content-os-core HTML composition contract, content-os-animation seek-safe rules, content-os-creative brand/pacing, content-os-media resolve cascade, and content-os-registry blocks. Routes source→video intents to Fase 3 workflows and dispatches Fase 2 capability skills. Extends the cabin router (Capa A) with source-to-video routes.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Content OS Router

Front door de **Content OS**. Intent router + capability map para deliverables
**source→video**. Adaptado de `hyperframes` (vendor, referencia, Apache 2.0) al
arquitectura local: route-once, route-by-deliverable (no por keyword), dispatch a
capability skills (Fase 2) + workflows source→video (Fase 3). Extiende el router
de cabina (Capa A en `CLAUDE.md`) con rutas source→video; no lo reemplaza.

Diferencia con el vendor: no hay `npx hyperframes skills update <workflow>`. Los
workflows son skills locales hash-bound (Fase 3, pendiente). El router es
**declarativo**: lee el intent, matchea el deliverable, escribe un
`intent-brief.jsonl` (route + capability_map), despacha. No renderiza. No instala
vía network. El render lo hace `content-os-core` (HTML→MP4 adapter).

- **Intent** — source (URL, PR, texto, website, brief) + deliverable (video type).
- **Route** — workflow Fase 3 que posee el deliverable end-to-end.
- **Capability map** — skills Fase 2 que el workflow carga on-demand (core,
  animation, keyframes, creative, media, registry).

Para el contrato técnico ver `content-os-core`. Para motion ver
`content-os-animation`. Para brand/pacing ver `content-os-creative`. Para media
ver `content-os-media`. Para bloques reusables ver `content-os-registry`. Esta
skill es la **capa de routing** encima del contract.

## Preflight (siempre)

1. Leer `schemas/router-intent-v1.schema.json` — cada intent registra
   `source_type`, `deliverable`, `route` (workflow Fase 3), `capability_map[]`.
2. Confirmar el deliverable matchea la route table (`references/routes.md`), no
   una keyword suelta. Route-by-deliverable, no route-by-keyword.
3. Para intents con `source_type` desconocido o sin `deliverable`, pedir un dato
   bloqueante (R0). No adivines la ruta.
4. Correr `scripts/route-audit.mjs <intent-brief>` antes de despachar. Fails closed
   si un intent sin route, sin capability_map, o con source_type desconocido.

## Default: route source→video

```bash
node <SKILL_DIR>/scripts/route-audit.mjs intent/intent-brief.jsonl --out <dir>
```

Routing: leer el intent (source + deliverable). Matchear deliverable contra la
route table (`references/routes.md`). Escribir `intent-brief.jsonl` con `route` +
`capability_map[]`. Despachar al workflow Fase 3 (si existe) o marcar `coverage_gap`
(Fase 3 pendiente). No network, no CLI fetch, no render.

## Routing table (source→video)

| Prioridad | Deliverable                                                | Route (Fase 3)                    |
| --------- | ---------------------------------------------------------- | --------------------------------- |
| 1         | Explicar un GitHub PR / code change desde una PR reference | `content-os-pr-to-video`          |
| 2         | Market/showcase un website/product/app desde URL o brief   | `content-os-website-to-video`     |
| 3         | Explicar un topic/articulo/notes con invented visuals      | `content-os-faceless-explainer`   |
| 4         | Market un product launch                                   | `content-os-product-launch-video` |
| 5         | Short unnarrated motion-first unit (<10s)                  | `content-os-motion-graphics`      |
| 6         | Add captions/subtitles a existing footage                  | `content-os-embedded-captions`    |
| 7         | Navigable deck/presentation (no MP4)                       | `content-os-slideshow`            |
| 8         | Any other custom video/composition                         | `content-os-general-video`        |

Fase 3 workflows pendientes. El router declara la route + capability_map ahora;
el workflow se materializa en Fase 3. Sin workflow, marcar `coverage_gap` y
despachar solo capabilities (draft manual).

## Capability map (dispatch on-demand)

| Need                                                | Capability skill       |
| --------------------------------------------------- | ---------------------- |
| Composition structure, timing, HTML→MP4 adapter     | `content-os-core`      |
| Motion rules, scene blueprints, transitions         | `content-os-animation` |
| Seek-safe GSAP, pose contract, keyframe lint        | `content-os-keyframes` |
| Brand, palette, typography, pacing, narration       | `content-os-creative`  |
| Media resolve (offline cascade), TTS, transcription | `content-os-media`     |
| Reusable blocks + components                        | `content-os-registry`  |

Capability skills nunca toman ownership del deliverable end-to-end. Carga solo
lo que el workflow activo necesita. El workflow (Fase 3) es el owner.

## Routing

| Topic                                               | Carga                                |
| --------------------------------------------------- | ------------------------------------ |
| Route a source→video intent                         | references/routes.md                 |
| Capture intent (source, deliverable, length, style) | references/intent-interview.md       |
| Router contract (route-once, route-by-deliverable)  | rules/router-contract.md             |
| Audit intent-brief (missing-route, unknown-source)  | scripts/route-audit.mjs              |
| Router intent schema                                | schemas/router-intent-v1.schema.json |

## Router Contract (ground truth)

1. **Route-once.** El router corre una vez por intent, escribe el
   `intent-brief.jsonl`, y sale. Nada re-abre el router. Toda pregunta
   "¿qué requirió la ruta?" se responde del brief.
2. **Route-by-deliverable.** Se rutcea por el **deliverable** pedido, no por una
   keyword o file type mencionado al pasar. La route table es first-match.
3. **Capability dispatch on-demand.** El capability_map[] declara qué skills Fase 2
   carga el workflow. Las capabilities nunca son owners del deliverable.
4. **Dual paradigm.** El router despacha a runtime HTML+GSAP (Content OS) por
   defecto. Si el intent pide Remotion explícito, enrutar a
   `remotion-video-production` (existente, no Content OS). No mezclar runtimes en
   un deliverable.
5. **Offline-first.** No network en el route path. No CLI fetch. El router lee
   intent local, escribe brief local. Media resuelto via `content-os-media`
   (offline cascade).
6. **Deterministic.** Mismo intent → misma route + mismo capability_map. Sin
   `Date.now()`/`Math.random()`/`new Date()` en el router (hereda core).
7. **No render.** El router no renderiza. El HTML→MP4 adapter vive en
   `content-os-core`. El workflow orquesta; el router solo enruta.
8. **RENDERED_DRAFT != HUMAN_APPROVED.** El deliverable produce `RENDERED_DRAFT`.
   `READY`/publicación requiere gates humanos G13-G17 (manuales por diseño).

## Resolve common ambiguities

- Un title/logo sting/stat hit/chart hit unnarrated <10s = `content-os-motion-graphics`.
  Un title card narrado o montaje largo = `content-os-general-video`.
- Footage existente + captions plain = `content-os-embedded-captions`. Footage +
  designed overlays = `talking-head-recut` (Fase 3 pendiente, fallback
  `content-os-general-video`).
- "Storyboard" cambia el review, no la route. Sin otra señal, `content-os-general-video`.
- URL + "make a video from this site" = `content-os-website-to-video`. URL como
  source material de un motion graphic short = `content-os-motion-graphics`.
- Piece >3min = `content-os-general-video`. Length nunca overridea un port/deck/
  caption/overlay explícito.

## Critical Constraints

- No `Date.now()`/`Math.random()`/`new Date()`/`performance.now()` en el router
  (hereda `content-os-core`).
- No `fetch`/`setTimeout`/`setInterval` en el route path (hereda core).
- No external assets / network / Google Fonts CDN (offline-first).
- No route-by-keyword. Matchea deliverable, no palabra suelta.
- No render en el router. El adapter vive en `content-os-core`.
- Sin `route` o sin `capability_map[]` en el brief: STOP, no despaches.

## Stop rules

- Intent brief auditable (`route-audit.mjs` PASS), route válida, capability_map[]
  cubre needs del deliverable: STOP route.
- Workflow Fase 3 existe: despachar al workflow. STOP.
- Workflow Fase 3 pendiente: marcar `coverage_gap`, despachar capabilities
  (draft manual), documentar gap. STOP route.
- Sin deliverable o source_type desconocido: STOP, pedir dato bloqueante (R0).

## Done

Intent ruteado (route válida + capability_map[]), `route-audit.mjs` PASS,
`intent-brief.jsonl` escrito, workflow Fase 3 despachado o `coverage_gap` marcado,
offline-first + deterministic + route-once heredados. `RENDERED_DRAFT` !=
`HUMAN_APPROVED`. `READY`/publicación bloquea gates humanos G13-G17 (manuales por
diseño).
