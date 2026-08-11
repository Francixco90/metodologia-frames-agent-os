# Steps receta — content-os-general-video

Receta detallada del orquestador freeform. SKILL.md mantiene el router (step
+ gate + puntero); este reference contiene el "cómo" completo. Gobernado por checker
(required) + package_manifest_sha256.

## Step 0: Setup + ingest

Brief confirmado por router. Congelar `source-pack-v1` con hash, procedencia,
derechos, autoridad y límites. Escribir `workflow-state.json` v2. La CLI `ingest`
verifica contenido real contra hashes. v1 solo produce reporte de migración.

## Step 1: Spec

Definir `video-spec-v1` como autoridad antes de scripts: objetivo, entregables,
narrativa, visual, audio, accesibilidad, runtime, aceptación y límites. Su SHA-256
se propaga a todos los derivados. Gate: `SPEC_APPROVED` explícito.

## Step 2: Script + plan

Crear `piece-scripts-v2`. Toda pieza declara propósito, audiencia, arco, decisión,
`sourceSpans`, `visualSpans`, claims y dependencias. `transcript_derived` requiere
`captionTrackRef` y `correctionLedgerRef`, ambos hash-bound. `plan` calcula claves independientes
para body/caption/overlay/curtain/audio e informa `hit`, `miss` e `invalidatedBy`.
El plan conserva hashes reales de script, piece scripts y assets; `render` los
recalcula y rechaza cualquier `generatedFrom` obsoleto.

## Step 3: Design + resolve

State viewer arc, structure, rhythm, duration driver. Para narrated arcs, read
`content-os-creative` story-spine; rhythm, beat-direction; structure, composition-patterns.
Para multi-scene, one `## Frame N` block per scene en `STORYBOARD.md` — `status: outline`,
declared `src:`, blueprint/rules citation (motion names from `content-os-animation` indexes,
never invented), beat text — **even when `storyboard: no`** (block = dispatch unit; board =
review surface only). Design spec (4 items si no existe). Ceiling treatment si
`flow: companion`. Gate: plan authored + design spec resolved + scene blocks declared.

Install registry blocks (`content-os-registry`) before parallel work. Stage user assets,
adopt existing media, resolve solo lo que el brief requiere (via `content-os-media`). Start
audio early cuando sus timings drive duration. Gate: dependencies resolved + media adopted +
blocks installed.

## Step 4: Build (scenes + motion)

Para short single-scene: implement scene at most visible moment antes de añadir motion
(confirmed wireframe = end state, no redraw), then animate from cited blueprint/rules — read
full recipe body (`content-os-animation` blueprints/rules) antes de escribir motion. Para
multi-scene: build inline si ≤6 short scenes; fan out via sub-agent dispatch si más (2-3
scenes per worker, una sola wave). Cada scene: `window.__timelines[id]`, `paused: true`,
seek-safe. Gate: all scenes built + motion authored + honors contract.

## Step 5: Assemble (mount + transitions + audio)

Mount scenes, media, transitions, captions, audio via production loop (`content-os-core`).
Real voice duration overrides estimates. Merge motion sidecars (durations + exit/entry
vectors into assembly). FFmpeg se invoca sin shell. Una corrección solo de audio
usa `audio-remux` y exige `-c:v copy`. Gate: assembled + synced + receipt.

## Step 6: Verify

`content-os-keyframes` lint (pose + seek-safe) + `content-os-core` check. Para
sub-compositions: inspect midpoint snapshots. Para multi-scene: review animation map.
Contrast findings resolved. Una repair pass in-place, rerun failed gate. Gate: lint + check
+ snapshots + contrast pass.

Además de lint/snapshots/contraste, validar evidencia, privacidad, hashes, audio,
miniclips y paridad A/B. Gate: veredicto consolidado con máximo
`RENDERED_DRAFT`.

## Step 7: Review + promote (human-gated)

La revisión humana consume el borrador y el veredicto sin editar compilados como
fuente. Promoción requiere receipt separado y gates G13-G17; queda fuera de la
autoridad de esta skill.
