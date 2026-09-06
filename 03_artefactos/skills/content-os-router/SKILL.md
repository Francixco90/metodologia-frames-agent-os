---
name: content-os-router
description: This skill should be used when the user asks to create, improve, plan or route content, generate video from a URL or GitHub PR, or dispatch a source-to-content capability.
version: 0.9.0
license: LicenseRef-MetodologIA-Internal
compatibility: Preserves router-intent-v1 and content-intent-v2. Adds a deterministic top-level R6/R7 dispatcher; CareerIntentV1 remains owned by career-application-orchestrator.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Frames ContentOS Router

## Contexto operativo

Lee [`context.md`](context.md) antes de cargar referencias. Define contexto, ruta, efectos,
gates y handoff.

Puerta para contenido, carrera, extensiones y mantenimiento. Enruta una vez, carga
capabilities y no instala, usa red ni renderiza; `content-os-core` conserva HTML→MP4.

`dispatchIntent()` conserva compatibilidad: R6/R7/R8/R9/R10 invocan sus adapters; R0 no.
Sin `adapter_invoked` y `domain_intent` solo hay planificación. R8/R9 requieren
aprobación y las señales mixtas nunca fusionan dominios.

## Default v2: brief antes de producir

1. Normaliza el pedido y calcula `requestHash`; no usa reloj ni azar.
2. Si faltan audiencia, resultado o fuente/autoridad, formula como máximo tres
   preguntas bloqueantes y conserva `brief_sufficiency: insufficient|partial`.
3. Selecciona la cadena mínima genérica: P03 siempre para una pieza nueva; P00/P01/P02/P04/P06
   solo por señales explícitas; P07 y P08 cierran revisión; P09 solo si se pide distribución.
   El perfil `commercial-proposal` usa P00 opcional → P01 → P02 → P03 → P05 → P06 → P07,
   excluye P04/P09 y bloquea P08 en V1; un sucesor requerirá verdict físico `REVISE`
   y receipt durable V2.
4. Emite `content-intent-v2` con `selected_stage_path`, reason codes, `brief_ref`
   y `next_gate`; las capabilities se resuelven desde los workflows seleccionados.
5. Materializa el `brief.md` con FramesBriefV1 y espera `MW_BRIEF_APPROVED` antes de
   producir, salvo autorización end-to-end inequívoca ya registrada. La distribución
   siempre se detiene en `MW_DISTRIBUTION_AUTHORIZED`. La propuesta comercial se limita a
   `RENDERED_DRAFT`; un deck requiere confirmación humana separada. [CONFIG]

`runFirstTurnGatewayV1` diferencia saludo, acción, ambigüedad y reanudación mediante
`AssistanceEnvelopeV1`. El saludo muestra **Frames ContentOS · por MetodologIA** y
`Crear · Mejorar · Planear · Explorar` sin writes. Skills siguen `planned` hasta que
`SkillInvocationReceiptV1` las liga a actor, WorkOrder y outputs. [CONFIG]

La metadata exterior deriva siempre del `AssistanceEnvelopeV1`: `BLOCKED` publica
`NEEDS_INPUT`, `next_gate: null` y el `coverage_gap` material; `ROUTED` espera una
selección y no anuncia anticipadamente un gate de aprobación. [CONFIG]

El transporte público acepta únicamente `decision_funnel`, `decision_selection` y
`decision_refs`. Funnel sin selección muestra exactamente dos opciones y no escribe;
la selección ligada habilita el brief local, pero referencias ausentes, cruzadas o no
canónicas bloquean antes de materializar. `experience_view` conserva los aportes
rescatados de candidatos descartados sin registrar razonamiento privado. [CONFIG]

```bash
node --import tsx <SKILL_DIR>/scripts/route-intent.mjs request.json
node <SKILL_DIR>/scripts/route-audit.mjs work/content/content-intent.json --out work/content/audit --strict
```

El brief Markdown es canónico. El HTML es una proyección verificable, nunca otra fuente
editorial. [CONFIG]

Esta skill solo enruta; el capability map resuelve implementación, motion, marca y media.
Video consume source analysis: `contain` default; `crop-safe` con evidencia; reels Spec First.

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
| 1         | Explicar un GitHub PR / code change desde una PR reference | `content-os-pr-to-video`          |
| 2         | Market/showcase un website/product/app desde URL o brief   | `content-os-website-to-video`     |
| 3         | Explicar un topic/articulo/notes con invented visuals      | `content-os-faceless-explainer`   |
| 4         | Market un product launch                                   | `content-os-product-launch-video` |
| 5         | Short unnarrated motion-first unit (<10s)                  | `content-os-motion-graphics`      |
| 6         | Add captions/subtitles a existing footage                  | `content-os-embedded-captions`    |
| 7         | Navigable deck/presentation (no MP4)                       | `content-os-slideshow`            |
| 8         | Any other custom video/composition                         | `content-os-general-video`        |

Para workflows Fase 3 pendientes, declarar route + capability_map. Sin workflow, marcar
`coverage_gap` y despachar capabilities (draft manual).

## Capability map (dispatch on-demand)

| Need                                                | Capability skill       |
| --------------------------------------------------- | ---------------------- |
| Composition structure, timing, HTML→MP4 adapter     | `content-os-core`      |
| Motion rules, scene blueprints, transitions         | `content-os-animation` |
| Seek-safe GSAP, pose contract, keyframe lint        | `content-os-keyframes` |
| Brand, palette, typography, pacing, narration       | `content-os-creative`  |
| Media resolve (offline cascade), TTS, transcription | `content-os-media`     |
| Reusable blocks + components                        | `content-os-registry`  |

Capabilities nunca poseen el deliverable end-to-end. Carga solo las necesarias; el
workflow Fase 3 es owner.

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
9. **Honest state projection.** `decision`, `next_gate` y `coverage_gap` se derivan
   del envelope; un estado bloqueado nunca se presenta como ruteado o aprobable.

Para cualquier borrador nuevo derivado de voz, el handoff exige contrato revision 2,
binding a la spec, `captionTrackRef`, `correctionLedgerRef`, verificación lingüística y
`sourceSpan`. Los trabajos v1 pueden abrirse en modo `read`, pero no producir un
`RENDERED_DRAFT` nuevo hasta migrarse.

Las ambigüedades de medio, duración, URL, storyboard y overlays se resuelven con
las reglas canónicas y casos borde de `references/routes.md`; este archivo no las
duplica.

## Critical Constraints

- Mantén el route path determinista, offline y sin render.
- Matchea el deliverable, nunca una palabra suelta.
- Sin `route` o `capability_map[]`: STOP, no despaches.

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
