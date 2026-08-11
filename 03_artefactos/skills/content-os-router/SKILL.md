---
name: content-os-router
description: This skill should be used when the user asks to "help me create a piece", "ayúdame a generar una pieza", "make a video from a URL", "clean a transcript", "review diction or English pronunciation", "search a transcript semantically", "build a narrative arc from a recording", "plan or edit content", "route a source to a Frames ContentOS workflow", or "dispatch capabilities for a source-to-content deliverable".
version: 0.7.0
license: LicenseRef-MetodologIA-Internal
compatibility: Preserves router-intent-v1 and content-intent-v2. Adds a deterministic top-level R6/R7 dispatcher; CareerIntentV1 remains owned by career-application-orchestrator.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Frames ContentOS Router

## Contexto operativo

Lee [`context.md`](context.md) antes de cargar referencias. Define el contexto mínimo, la ruta, los efectos permitidos, los gates y el handoff de esta skill.

Puerta de entrada única de Frames para contenido, carrera, extensiones privadas y mantenimiento, compatible
con `source-to-video` v1. Enruta una vez por deliverable, carga capabilities bajo
demanda y despacha workflows locales hash-bound. No instala, consulta la red ni
renderiza; `content-os-core` conserva el adapter HTML→MP4.

`scripts/route-intent.mjs` conserva la decisión compatible y añade
`dispatchIntent()`: R6 ejecuta `routeContentIntent`, R7 `routeCareerIntent`, R8
`routeLocalExtensionIntent`, R9 `routeMaintenanceIntent`, y R0 no invoca adapter. Un locator sin `adapter_invoked` y
`domain_intent` es planificación, no ejecución. R8 y R9 se detienen en aprobación antes de mutar. Una señal mixta o ausente nunca
fusiona dominios.

- **Intent** — source (URL, PR, texto, website, brief) + deliverable (video type).
- **Route** — workflow Fase 3 que posee el deliverable end-to-end.
- **Capability map** — skills Fase 2 que el workflow carga on-demand (core,
  animation, keyframes, creative, media, registry).

## Default v2: brief antes de producir

1. Normaliza el pedido y calcula `requestHash`; no usa reloj ni azar.
2. Si faltan audiencia, resultado o fuente/autoridad, formula como máximo tres
   preguntas bloqueantes y conserva `brief_sufficiency: insufficient|partial`.
3. Selecciona la cadena mínima: P03 siempre para una pieza nueva; P00/P01/P02/P04/P06
   solo por señales explícitas; P07 y P08 siempre; P09 solo si se pide distribución.
4. Emite `content-intent-v2` con `selected_stage_path`, reason codes, `brief_ref`
   y `next_gate`; las capabilities se resuelven desde los workflows seleccionados.
5. Materializa el `brief.md` con FramesBriefV1 y espera `MW_BRIEF_APPROVED` antes de
   producir, salvo autorización end-to-end inequívoca ya registrada. La distribución
   siempre se detiene en `MW_DISTRIBUTION_AUTHORIZED`.

Antes de este adapter, `runFirstTurnGatewayV1` emite `AssistanceEnvelopeV1` y diferencia saludo, acción,
ambigüedad y reanudación. Un saludo muestra **Frames ContentOS · por
MetodologIA** y `Crear · Mejorar · Planear · Explorar` sin prime ni writes. Un
pedido accionable omite el menú y prepara un preview del brief. Skills del plan
permanecen `planned` hasta que un `SkillInvocationReceiptV1` las liga a actor,
WorkOrder y outputs materiales. [CONFIG]

```bash
node --import tsx <SKILL_DIR>/scripts/route-intent.mjs request.json
node <SKILL_DIR>/scripts/route-audit.mjs work/content/content-intent.json --out work/content/audit --strict
```

El brief Markdown es canónico. El HTML es una proyección opcional y verificable del
mismo modelo; nunca una segunda fuente editorial. [CONFIG]

Esta skill solo enruta; el capability map siguiente resuelve implementación,
motion, marca, media y bloques reutilizables.

## Preflight (siempre)

1. Leer `schemas/router-intent-v1.schema.json` — cada intent registra
   `source_type`, `deliverable`, `route` (workflow Fase 3), `capability_map[]`.
2. Confirmar el deliverable matchea la route table (`references/routes.md`), no
   una keyword suelta. Route-by-deliverable, no route-by-keyword.
3. Para intents con `source_type` desconocido o sin `deliverable`, pedir un dato
   bloqueante (R0). No adivines la ruta.
4. Correr `scripts/route-audit.mjs <intent-brief>` antes de despachar. Fails closed
   si un intent sin route, sin capability_map, o con source_type desconocido.

## Routing table (source→video)

| Prioridad | Deliverable                                                | Route (Fase 3)                    |
| --------- | ---------------------------------------------------------- | --------------------------------- |
| 0         | Transcribir, limpiar, subtitular, buscar o mapear narrativa | `content-os-transcript-intelligence` |
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
| Revisión lingüística, captions, búsqueda y narrativa | `content-os-transcript-intelligence` |
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
| Content intent v2 + adaptive P00-P09                | schemas/content-intent-v2.schema.json |
| Deterministic source-to-content dispatcher          | scripts/route-content.mjs             |

## Router Contract (ground truth)

1. **Route-once.** El router corre una vez por intent, escribe el
   `intent-brief.jsonl`, y sale. Nada re-abre el router. Toda pregunta
   "¿qué requirió la ruta?" se responde del brief.
2. **Route-by-deliverable.** Se rutcea por el **deliverable** pedido, no por una
   keyword o file type mencionado al pasar. La route table es first-match.
3. **Capability dispatch on-demand.** El capability_map[] declara qué skills Fase 2
   carga el workflow. Las capabilities nunca son owners del deliverable.
4. **Dual paradigm.** El router despacha a runtime HTML+GSAP (Frames ContentOS) por
   defecto. Si el intent pide Remotion explícito, enrutar a
   `remotion-video-production` (existente, no Frames ContentOS). No mezclar runtimes en
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
9. **Voice gate.** Toda ruta basada en voz agrega
   `content-os-transcript-intelligence` al capability map. Solicitudes de dicción,
   pronunciación, limpieza, búsqueda o arco narrativo enrutan directamente allí.

Las ambigüedades de medio, duración, URL, storyboard y overlays se resuelven con
las reglas canónicas y casos borde de `references/routes.md`; este archivo no las
duplica.

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

Intent ruteado con `capability_map[]`, auditoría PASS y workflow o `coverage_gap`.
Opera offline.
`RENDERED_DRAFT` no es aprobación; publicar exige gates humanos G13-G17.
