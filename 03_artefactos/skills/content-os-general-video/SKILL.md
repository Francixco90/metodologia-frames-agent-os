---
name: content-os-general-video
description: This skill should be used when the user asks to "author a custom video", "build a brand reel or sizzle reel", "make a montage", "build a multi-scene video when no specialized workflow fits", "remix existing footage", "build a static title card or loop", or "co-create a freeform video (companion flow)".
version: 0.14.0
license: LicenseRef-MetodologIA-Internal
compatibility: Orchestrates content-os-core (HTML composition + seek-safe GSAP), content-os-animation (blueprints/rules), content-os-keyframes (pose/lint), content-os-creative (brand/story-spine/genre lenses), content-os-media (offline + remote-opt-in), content-os-registry (blocks), content-os-router (dispatch). Input = freeform brief. Output = MP4 (RENDERED_DRAFT). Companion or automation flow.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Frames ContentOS General Video

Orquestador freeform: autor un video custom cuando ningún workflow especializado encaja —
brand reels, sizzle reels, montajes, multi-scene pieces, static loops, title cards, footage
remixes, freeform builds. Adaptado de `general-video` (vendor, Apache 2.0) a fail-closed +
hash-bound + offline-first. No `npx hyperframes` CLI. Capabilities delegadas (ver
frontmatter `compatibility`).

La revisión 0.14 ejecuta las compuertas canónicas de Media y Creative: no basta declarar
sus hashes; ASR, Transcript Intelligence, manifests de marca y assets deben resolverse y
validarse sin escapes, symlinks ni deriva antes de compilar.

## When to use this vs a specialized workflow

El router deriva explicadores, PR, lanzamientos, motion graphics, talking-head con captions
y decks a sus workflows especializados. Usa `content-os-general-video` para el resto:
multi-scene, brand reel, montage, title card o remix freeform.

## Autoridad Spec First

Todo trabajo nuevo usa `general-video-v2` revisión 2 y la secuencia canónica
`Spec → Compile → Verify → Review → Promote`. La especificación aprobada es la
autoridad: scripts, EDL, captions, overlays, assets, planes y receipts deben declarar el
mismo `specId` y `specSha256`. Los trabajos v1 son legibles para migración, pero `render`
los bloquea. Nunca se corrige un output compilado como si fuera fuente.

Cada pieza usa `piece-scripts-v2`: `scriptMode`, `decision`, `sourceSpans`, `visualSpans`,
`captionTrackRef`, `correctionLedgerRef`, claims y dependencias hash-bound. Las decisiones
son `use`, `extend`, `reframe` o `discard`; sin evidencia suficiente no se fuerza una pieza.

La CLI local `scripts/video-cli.mjs` expone `ingest`, `index`, `script`, `plan`, `render`,
`verify` y `package`. Opera offline, sin shell, con rutas relativas al proyecto. `render`
solo ejecuta jobs FFmpeg declarados y validados por `plan`; `audio-remux` exige
`-c:v copy`. La caché separa cuerpo, captions, gráficos, cortinillas y audio para invalidar
únicamente capas y piezas dependientes. El render permite solo inputs de archivo relativos
al proyecto y limita FFmpeg al protocolo `file`; protocolos de red quedan bloqueados.

## Storyboard — review surface

Con `storyboard: yes`, plan y sketch forman la review surface; con `no`, se construye sin
board. “Just build it” equivale a `flow: automation`, `storyboard: no`.

Eres el **orchestrator**. Trabaja en `videos/<project>/`. Corre steps en orden, pasa cada
gate. User-gated: 0, 6. Delega a capabilities; no dupliques rules. step-gated orchestrator
(setup→plan→resolve→build→assemble→verify→finalize); freeform when no specialized workflow
fits; hash-bound via sha256; deterministic seek-safe (window.__timelines, paused: true,
tl.seek(frame/fps)); offline-first render path; scope exact.

## Preflight (siempre)

1. Confirmar `route: content-os-general-video` y `capability_map[]` en el brief.
2. Cargar `content-os-media` para operaciones de medios; lo remoto es opt-in y auth-gated.
   Figma usa assets/tokens exportados, sin conectores.
3. Verificar contratos de composición y marca; usar fuentes locales.
4. Correr `scripts/workflow-audit.mjs`.

## Workflow Contract (ground truth)

El orchestrator mantiene scope exacto, dispatch bajo demanda y gates step-gated. El render
es offline-first, determinista y seek-safe: GSAP `paused: true`, scrub a `t`, sin
`Date.now()`, `Math.random()`, repeats infinitos ni CSS transitions. La verdad de diseño se
resuelve `frame.md` → `design.md` → `DESIGN.md`; `window.__timelines` conserva la superficie
seekable. `RENDERED_DRAFT` puede compilarse tras gates deterministas, pero
`HUMAN_APPROVED`, `READY` y `PUBLISHED` requieren revisión externa G13-G17.

## Steps (router — detail en `references/steps-receta.md`)

| Step | Acción | Gate |
| --- | --- | --- |
| 0 Setup/Ingest | Router brief, fuente congelada y hashes. | intent + source pack |
| 1 Spec | Especificación canónica aprobada y hash-bound. | `SPEC_APPROVED` |
| 2 Script/Plan | Script semántico, spans, captions, EDL, capas y caché. | contracts + evidence |
| 3 Resolve/Build | Resolver assets y compilar escenas/capas deterministas. | deps + build manifest |
| 4 Assemble | FFmpeg ensambla; correcciones solo de audio usan remux. | assembled + receipts |
| 5 Verify | Editorial, visual, privacidad, A/B, audio y técnica. | deterministic pass |
| 6 Review | Revisión humana separada; no altera compilados. | human receipt o STOP |
| 7 Promote | Solo con gates externos G13-G17. | fuera de autoridad de la skill |

## Stop rules

- `workflow-audit.mjs` PASS + gates + final.mp4 verified: STOP.
- Step user-gated sin approval: STOP, pedir approval.
- Intent no confirmado (router no despachó general-video): STOP, re-route.
- Sin brief: STOP, rutcea via `content-os-router`.
- Brief encaja en especializado: STOP, hand off al correcto.

## Done

`renders/final.mp4` (`RENDERED_DRAFT`) verificado, con preview, duración y snapshots.
`READY` y publicación requieren G13-G17. Esta versión permanece `local-evaluation`.

## A/B y miniclips

Un grupo A/B usa `ab-test-v1` con `variantAxis: visual`. Duración, frame count, copy, CTA,
cortinillas, timing y PCM son invariantes recalculados desde outputs y referencias
hash-bound. La pista visual debe ser distinta. Si cualquier invariante difiere,
el par queda bloqueado. El gate de miniclips además exige Poppins en captions, Montserrat en
títulos/disclosures, máximo dos niveles de texto simultáneos, safe zones, audio a
−16 LUFS ±0,3 con máximo −1,5 dBTP, y cero logos/copy prohibidos.

La limpieza fuente usa `source-cleanup-mask-v1`: máscara y generador hash-bound, filtro
anterior a escala/tratamiento, evidencia geométrica sobre el cuerpo limpio y binding A/B.

Los pipelines de frames precompuestos usan exclusivamente `precomposed-frames-v1`.
Cada pieza liga adaptador, manifiesto, todos los frames, audio, configuración determinista y
la limpieza aplicada antes del tratamiento. `render` y `verify` recalculan esos hashes y
emiten `adapterEvidence`; un frame ausente o mutado, una omisión de limpieza o un manifiesto
sin derivación reproducible bloquean el borrador. No existe un bypass de receipts genérico.

`branded-wrapper-v1` ensambla intro + cuerpo original + outro únicamente cuando los perfiles
son compatibles para stream-copy. El cuerpo no recibe música, overlays, ganancia ni
normalización. El receipt prueba preservación de packets de audio y video; las cabeceras del
primer access unit de video pueden normalizarse por el contenedor, pero nunca recodificarse.
El brand kit puede ser `metodologia` con generador versionado o `user-provided` con derechos,
procedencia y hashes explícitos. En A/B, intro y outro son idénticos y cada audio de cuerpo se
preserva respecto de su fuente.

Antes de componer footage, `source-analysis-v1` registra dimensiones, audio fuente, muestras
temporales y observaciones móviles; `composition-fit-v1` demuestra que crop, contain o split
encajan en el canvas sin reintroducir marcas. Una muestra omitida bloquea el render. El audio
fuente usa `preserve` por defecto: reemplazo, normalización o ganancia requieren otra fuente y
autoridad, nunca una mutación silenciosa del cuerpo. `storyboard-multiframe-v1` liga dos o más
momentos ordenados a spans y fits verificables, no trata cada frame como una diapositiva.
La única autoridad de `source-analysis-v1` vive en `content-os-media`; esta skill la consume
como schema sibling y no mantiene una copia.
Un crop `safe` exige evidencia multiframe hash-bound: dos o más tiempos, frames reales y
cobertura completa; ausencia, drift o symlink bloquean.

Los refs de marca y presupuesto visual usan los contratos canónicos
`content-os-creative/schemas/brand-kit-v1` y `visual-budget-v1`; General Video solo conserva y
rehash-bindea sus refs en spec/piezas. El manifiesto `branded-wrapper-v1` describe el ensamblaje
intro/cuerpo/outro y no redefine el brand kit creativo.
