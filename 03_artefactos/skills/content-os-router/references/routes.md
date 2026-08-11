# Routes — source-to-content

## First-turn dispatch

El gateway recibe saludos sin escribir y solo entrega al dispatcher los pedidos
accionables. `dispatchIntent()` ejecuta el adapter R6 o R7 seleccionado y conserva
R0 como parada explícita; no presenta una ruta declarada como ejecución real.

## Adaptive P00-P09 route

For every new content piece, route through P03, P05, P07 and P08. Prepend P00
when brand/voice/channel is unresolved, P01 when source materials require
curation, and P02 when evidence is insufficient. Add P04 for a series or
campaign, P06 when assets must be created, and P09 only when distribution was
requested. Editing an existing governed piece may use P07→P08. [CONFIG]

The route produces a canonical `brief.md` and stops at `MW_BRIEF_APPROVED`.
P09 always stops at `MW_DISTRIBUTION_AUTHORIZED`; it never publishes. [CONFIG]

The table below is the backward-compatible source-to-video specialization.

Route table para deliverables Frames ContentOS. First-match por **deliverable**, no
por keyword. Route-once: el router escribe el `intent-brief.jsonl` y sale.

## Fase 3 workflows (source→video)

| Prioridad | Deliverable                                                | Route                             | Capability map (típica)                               |
| --------- | ---------------------------------------------------------- | --------------------------------- | ----------------------------------------------------- |
| 0         | Transcript/captions/diction/pronunciation/semantic/narrative | `content-os-transcript-intelligence` | transcript-intelligence, media when audio ingest is needed |
| 1         | Explicar un GitHub PR / code change desde una PR reference | `content-os-pr-to-video`          | core, animation, keyframes, creative, media           |
| 2         | Market/showcase un website/product/app desde URL o brief   | `content-os-website-to-video`     | core, animation, keyframes, creative, media, registry |
| 3         | Explicar un topic/articulo/notes con invented visuals      | `content-os-faceless-explainer`   | core, animation, keyframes, creative, media           |
| 4         | Market un product launch                                   | `content-os-product-launch-video` | core, animation, keyframes, creative, media, registry |
| 5         | Short unnarrated motion-first unit (<10s)                  | `content-os-motion-graphics`      | core, animation, keyframes                            |
| 6         | Add captions/subtitles a existing footage                  | `content-os-embedded-captions`    | core, media                                           |
| 7         | Navigable deck/presentation (no MP4)                       | `content-os-slideshow`            | core, animation, creative                             |
| 8         | Any other custom video/composition                         | `content-os-general-video`        | core, animation, keyframes, creative, media, registry |

Fase 3 workflows pendientes. El router declara la route + capability_map ahora;
el workflow se materializa en Fase 3. Sin workflow, marcar `coverage_gap` y
despachar solo capabilities (draft manual).

## Capability dispatch

Capability skills (Fase 2) nunca son owners del deliverable end-to-end. El
workflow (Fase 3) es el owner. Carga solo lo que el workflow activo necesita.

| Need                                                | Capability skill       |
| --------------------------------------------------- | ---------------------- |
| Composition structure, timing, HTML→MP4 adapter     | `content-os-core`      |
| Motion rules, scene blueprints, transitions         | `content-os-animation` |
| Seek-safe GSAP, pose contract, keyframe lint        | `content-os-keyframes` |
| Brand, palette, typography, pacing, narration       | `content-os-creative`  |
| Media resolve (offline cascade), TTS, transcription | `content-os-media`     |
| Language review, captions, semantic search, narrative | `content-os-transcript-intelligence` |
| Reusable blocks + components                        | `content-os-registry`  |

## Dual paradigm

El router despacha a runtime HTML+GSAP (Frames ContentOS) por defecto. Si el intent
pide Remotion explícito, enrutar a `remotion-video-production` (existente, no
Frames ContentOS). No mezclar runtimes en un deliverable.

## Ambigüedades

- Title/logo sting/stat hit unnarrado <10s = `content-os-motion-graphics`.
  Title card narrado o montaje largo = `content-os-general-video`.
- Footage existente + captions plain = `content-os-embedded-captions`. Footage +
  designed overlays = `talking-head-recut` (Fase 3 pendiente, fallback
  `content-os-general-video`).
- "Storyboard" cambia el review, no la route. Sin otra señal,
  `content-os-general-video`.
- URL + "make a video from this site" = `content-os-website-to-video`. URL como
  source material de un motion graphic short = `content-os-motion-graphics`.
- Piece >3min = `content-os-general-video`. Length nunca overridea un port/deck/
  caption/overlay explícito.
