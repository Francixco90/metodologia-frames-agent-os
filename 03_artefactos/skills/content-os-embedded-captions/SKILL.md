---
name: content-os-embedded-captions
description: This skill should be used when the user asks to "add captions to a video", "subtitle a talking-head clip", "embed captions behind the subject", "add cinematic captions", "burn in subtitles", "add VFX caption styling", "caption an explainer or voiceover video", or "add styled captions to an existing single-subject talking-head video without editing the footage".
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Orchestrates content-os-core (HTML→caption frames + Playwright/FFmpeg composite adapter), content-os-animation (caption motion vocabulary), content-os-keyframes (pose/lint), content-os-creative (brand tokens/identity), content-os-media (transcription + subject matting, offline-default + remote opt-in auth-gated), content-os-registry (caption block reuse). Input = existing single-subject talking-head video (footage). Captions derived from footage speech via transcription. Output RENDERED_DRAFT (final.mp4, footage untouched + captions composited).
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Frames ContentOS Embedded Captions

Orquestador footage→captioned-video: añade captions/subtítulos a un video
**talking-head existente** sin editar el footage. El video base se entrega
**intacto** — las captions son la única adición (matte occlusion deja al sujeto
cubrir las embed tracks). Adaptado de `embedded-captions` (vendor, referencia,
Apache 2.0) al arquitectura local fail-closed + hash-bound + render-path
offline-first.

Diferencia con el vendor: no `npx hyperframes` CLI, no `hyperframes init`, no
`prepare.sh`/`render-and-composite.sh` mágicos. Transcription via
`content-os-media` (whisper.cpp offline default; WhisperX remote opt-in
auth-gated). Matting via `content-os-media` (ffmpeg bg-removal local default;
remote opt-in auth-gated). Composition via `content-os-core` (HTML+GSAP
seekable → frames → FFmpeg composite). Lint via `content-os-keyframes`.
Identity catalog via `content-os-creative` + `references/identity-catalog.md`.

## Caption model — rail + embed

Cada frase hablada es una de tres cosas:

|         | Qué                                       | Cómo se muestra                                                                                |
| ------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `drop`  | filler — um/uh, tartamudeos, correcciones | no se muestra                                                                                  |
| `rail`  | default — contenido hablado (verbatim)    | lower-third subtitle, **en frente**, legible. Punch word puede tener `emphasis` inline.        |
| `embed` | pico promovido — el headline beat         | una palabra grande compuesta **detrás del sujeto** (matte occlusion), entrada + exit diseñados |

**El rail lleva la mayoría del texto; embed es el pico escaso, ganado.** Scarcity
per beat/block (≤1 hero por bloque, nunca dos co-visibles, ≥ un beat de aire
entre hero windows). Embedding every word es el error común → violación
`embed-overuse`. La mayoría explainer/voiceover es **Standard** (rail + embed
climax); **Cinematic** es pure embed (mood-over-verbatim); **Theme** es themed
constitution (VFX-grade).

Eres el **orchestrator**. Trabaja en `videos/<project>/`. Corre steps en orden,
pasa cada gate antes de continuar. Steps user-gated: Step 0, Step 6. Delega
transcription/matting a capabilities; no dupliques rules aquí.

step-gated orchestrator (setup→prepare→plan→design→build→verify→finalize);
footage delivered untouched (captions only); rail-first (embed scarce); hash-bound
via sha256 (registry + 4 lifecycle events). matte occlusion via content-os-media
(subject segmentation offline-default + remote opt-in auth-gated); deterministic
seek-safe (window.__timelines, paused: true, tl.seek(frame/fps)); offline-first
render path (footage frames + caption frames + composite all offline).

## Preflight (siempre)

1. Confirmar route: `content-os-router` despachó con `route:
content-os-embedded-captions` + `capability_map[]` en el `intent-brief.jsonl`.
   Sin brief, rutcea primero via el router.
2. **Decision gate — RUN FIRST.** Probe el clip (`ffprobe` + sample frames at
   20/50/80% + 1fps contact sheet). Rechazar si: múltiples speakers/hard cuts,
   sin sujeto humano (no talking-head), <3s o sin speech o face nunca visible,
   **source ya tiene burned-in captions/subtitles** (segundo caption system
   conflictúa; footage intacto, no covering/inpainting), transcript garbage
   (heavy-accent → Whisper alucina; sanity-read antes de authoring), busy
   handheld con fast motion (matte flickers). Split multi-shot antes de aplicar.
3. Pre-flight probes: shot-cut (trim antes del cut), letterbox/pillarbox
   (constrain placement), luminance (caption region luma → scrim/opaque pick),
   identity recommendation by tone (recomiendas, user elige).
4. Verificar `content-os-core` HTML composition contract (`data-*` timing,
   seekable GSAP, framework-owned media).
5. Verificar `content-os-media` transcription + matting (offline cascade
   default; remote opt-in auth-gated, fail-closed).
6. Correr `scripts/workflow-audit.mjs <project-state>` antes de avanzar gates.

## Default: talking-head footage → captioned video

```bash
node <SKILL_DIR>/scripts/workflow-audit.mjs videos/<project>/workflow-state.yml --out <dir>
```

Workflow: Step 0 setup → Step 1 prepare (matte ∥ transcribe ∥ audio-envelope →
safe-zones) → Step 2 plan (pick identity + caption plan) → Step 3 design (caption
groups, planes, hero) → Step 4 build (HTML composition, seek-safe GSAP) → Step 5
verify (preview + Visual QA + gates) → Step 6 finalize/render (composite caption
layers over footage → final.mp4). Cada step tiene gate. Output
`renders/final.mp4` = `RENDERED_DRAFT`.

## Modes

| Mode        | Caption model                                  | When                                              |
| ----------- | ---------------------------------------------- | ------------------------------------------------- |
| `standard`  | rail (default) + embed climax                  | explainer / voiceover / must-read words (default) |
| `cinematic` | pure embed (no rail, every word embed)         | poetic / social / mood-over-verbatim              |
| `theme`     | themed constitution (body × hero × fx × plate) | VFX-grade ("炸", "特效", named worlds)            |

**Rail-first for talking-head/explainer.** Don't embed the whole transcript.
Embed is the scarce, earned peak.

## Identity catalog

Identidades se eligen del catálogo en `references/identity-catalog.md` (DNA
registry + themes). El user elige UNA identity (`identity` field); engine,
compiler y authoring file se derivan por lookup. **Nunca surfaces
"Standard vs Cinematic vs Theme" como pregunta** — son backend names. Recomiendas
una con one-line why; el user elige. Unsure → `anchor` (rail-surface, words read,
scene safe).

DNA registry (10 scene-parameterized visual languages): `cream`, `ink` (bright
scenes luma > 150), `editorial`, `keynote`, `documentary`, `loud`, `neon`,
`glitch`, `chrome`, `velocity`. Themes (themed constitutions): `anchor`,
`ordnance`, `terminal`, `neonsign`, `stardust`, `stomp`, + más.

## Routing (delegate to capabilities)

| Need                                                         | Capability             |
| ------------------------------------------------------------ | ---------------------- |
| Composition contract, HTML→caption frames, composite adapter | `content-os-core`      |
| Caption motion vocabulary, transitions                       | `content-os-animation` |
| Pose contract, lint, snapshot                                | `content-os-keyframes` |
| Brand tokens, identity, layout                               | `content-os-creative`  |
| Transcription + subject matting (offline + remote opt-in)    | `content-os-media`     |
| Reusable caption blocks (rail, embed, lower-thirds)          | `content-os-registry`  |

## Workflow Contract (ground truth)

1. **Orchestrator, no rules.** Este workflow orquesta steps + gates. Design y
   motion rules viven en capabilities. No dupliques.
2. **Footage untouched.** El video base se entrega intacto — captions son la
   única adición. `graded_footage: true` = violación `graded-footage` (never
   grade/recolor/scanline/duotone/vignette el a-roll). Matte solo deja al sujeto
   ocultar embed tracks; no covering/inpainting.
3. **Rail-first.** Rail lleva la mayoría del texto; embed es el pico escaso.
   `embed_all: true` o `rail_mode: none` = violación `embed-overuse`. ≤1 embed
   per beat, nunca dos co-visibles, ≥ un beat de aire.
4. **Transcription-derived.** Captions derivadas del speech del footage vía
   `content-os-media` (transcription offline default). `has_script: false` (no
   SCRIPT.md authored — transcript es derivado, no autoría). `vo_mode:
transcribed` (el VO es el speech propio del footage).
5. **Step-gated.** Cada step tiene gate. Sin gate pasado, no avanzas. Steps
   user-gated (0, 6) pausan para approval. Step 1 prepare corre matte ∥
   transcribe ∥ audio-envelope (delegate `content-os-media`).
6. **Delega capabilities on-demand.** Carga solo lo que el step activo necesita.
7. **Render-path offline-first.** Footage frames (FFmpeg extract) + caption
   frames (Playwright HTML→frames) + composite (FFmpeg) — todo offline. Step 1
   transcription + matting: offline default, remote opt-in auth-gated (único
   network path, dado engines remotos). No network en render path (Steps 4-6).
8. **Deterministic.** Mismo footage + mismo caption plan + mismo frames → mismo
   render. Sin `Date.now()`/`Math.random()`/`new Date()` en compositions.
9. **Seek-safe.** GSAP `paused: true`, scrubbed a frame `t` (hereda
   `content-os-animation`). No `repeat: -1`, no relative `+=`, no CSS `transition:`
   en animated elements.
10. **RENDERED_DRAFT != HUMAN_APPROVED.** `renders/final.mp4` es `RENDERED_DRAFT`.
    `finalize` gate passed sin render = `no-render` violación. `READY`/publicación
    requiere gates humanos G13-G17 (manuales por diseño).

## Non-negotiables (hereda vendor)

- **Face nunca 100% cubierto continuamente** — every 0.3s window, face bbox ≥30%
  uncovered.
- **WCAG contrast** — final render lints; fix palette si falla.
- **Word timings match transcript within 80ms** — caption firing 500ms off-beat
  destruye la ilusión.
- **Each caption ≥ 0.5s on screen** — shorter = unreadable.
- **Captions stay on-frame** — overflow gate (intentional bleed única excepción).
- **No two caption groups overlap in time AND screen region** — spatial
  separation (default) o handoff o deliberate layered (`allow_overlap`).

## Steps (summary)

### Step 0: Setup

Brief confirmado por router. Decision gate: probe clip (`ffprobe` + sample
frames + 1fps contact sheet). Rechazar bad clips (multi-speaker, no subject,
burned-in captions, garbage transcript, busy handheld). Pre-flight probes
(shot-cut, letterbox, luminance, identity recommendation). Resolver project dir
(`videos/<subject>-captions/`). Escribir `workflow-state.yml` (project, route,
capability_map, mode draft, identity draft, vo_mode transcribed, has_script
false, footage true, offline true). Gate: clip accepted + state file + probes
done.

### Step 1: Prepare (matte ∥ transcribe ∥ audio-envelope → safe-zones)

Correr en paralelo via `content-os-media`:

- **Matte** (subject segmentation): ffmpeg bg-removal local default (u2net
  offline) / remote opt-in auth-gated. Output `frames_fg/` (alpha matte per
  frame).
- **Transcribe**: whisper.cpp offline default (word-level timings) / WhisperX
  remote opt-in auth-gated. Output `transcript.json` (word timings). Sanity-read:
  si no parsea como lenguaje, probar modelo mayor, else refuse (verbatim rail de
  fabricated words es peor que no captions).
- **Audio-envelope**: RMS per frame (hero amplitude coupling). Output
  `audio-envelope.json`.
- **Safe-zones**: silhouette abutment zones (hugLeft/hugRight), heroAnchor,
  heroBands, palette/optics/lighting. Output `safe-zones.json`.
  Gate: matte + transcript + envelope + safe-zones listos (o remote opt-in
  declarado con auth).

### Step 2: Plan (pick identity + caption plan)

Pick UNA identity del catálogo (`references/identity-catalog.md`). Recomiendas
con one-line why; user elige (autonomous mode: tú eliges, state el why). Clasificar
transcript en drop/rail/embed (drop filler, rail verbatim, embed peaks escasos).
Author caption plan JSON (`plan.json` standard/cinematic, `theme.json` theme):
thought-blocks (2-5 words por clause boundary), plane per block, ≤1 hero por
block, `hero: true` marcado. Gate: identity picked + caption plan authored +
drop/rail/embed classified.

### Step 3: Design (caption groups, planes, hero)

Designar planes contra `safe-zones.json` (narration in hugLeft/hugRight, hero en
heroAnchor/heroBands.best ~30-55% occluded). Composition craft: planes &
clean-zone anchoring, zone coherence, climax pop, edge-breathing, occlusion
3-step judgement, accumulation/persistence (ver `references/caption-model.md`).
Finalizar `shot-plan.json` (content.block + content.customize + per-block
content). Gate: shot-plan final + planes chosen + hero declared.

### Step 4: Build (reuse-first)

Build `compositions/index.html` via `content-os-core` contract (seek-safe GSAP,
`window.__timelines`, `class="clip"` + stable ids, `tl.seek(0)`, deterministic).
Caption tracks: embed track (behind subject, matte occlusion), rail track
(front). Reuse-first: catalog caption blocks via `content-os-registry` +
customize in place; hand-author solo gaps. Composite layer order: footage frame
→ embed caption → matte (subject) → rail caption (front). Gate: `index.html`
built + honors contract + layer order declared.

### Step 5: Verify (preview + Visual QA + gates)

`content-os-keyframes` lint (pose + seek-safe) + `content-os-core` check.
Preview frames: composite caption layers at seek-time + real video frame + matte
occlusion + rail overlay = faithful preview (~2s/frame, no render). Visual QA
checklist (`references/visual-qa.md`): washout, text-on-text, reading order,
hero presence, balance + 5 positive checks. Gates: timing (word timings match
transcript within 80ms), occlusion+hero (face ≥30% uncovered per 0.3s), overflow
(captions on-frame), contrast (WCAG), hand-off (no overlap time+region). Una
repair pass in-place, rerun failed gate. Gate: lint + check + preview + gates
pass.

### Step 6: Finalize / Approve + Render

User review (user-gated). Preguntar: "preview first, or render?" Si preview,
abrir previews, volver al mismo gate tras revisions. Render solo tras explicit
render answer: extract footage frames (FFmpeg) → render caption layers (Playwright
HTML→frames) → composite (FFmpeg: footage + embed + matte + rail) →
`renders/final.mp4`. Verificar output exists, non-empty, duration match footage.
Gate: checks pass + user approval + final.mp4 exists.

## Critical Constraints

- step-gated orchestrator (setup→prepare→plan→design→build→verify→finalize);
  footage delivered untouched (captions only); rail-first (embed scarce);
  hash-bound via sha256 (registry + 4 lifecycle events).
- No `Date.now()`/`Math.random()`/`new Date()`/`performance.now()` en
  compositions (hereda `content-os-core`).
- No `fetch`/`setTimeout`/`setInterval` en compositions (hereda core).
- No network en render path (Steps 4-6). Único network path: Step 1 prepare
  (transcription + matting remote opt-in auth-gated).
- No `repeat: -1` / relative `+=` / CSS `transition:` en animated elements
  (hereda `content-os-animation` + `content-os-keyframes`).
- No grade/recolor/scanline/duotone/vignette el footage (`graded-footage`).
- No burned-in captions en source (decision gate refuse).
- No embed overuse (rail-first; embed scarce per beat).
- Word timings match transcript within 80ms; each caption ≥ 0.5s.
- Sin gate pasado, no avanzas. Steps user-gated (0, 6) pausan.
- `renders/final.mp4` = `RENDERED_DRAFT`, no `HUMAN_APPROVED`.

## Stop rules

- Workflow auditable (`workflow-audit.mjs` PASS), todos gates pasados, final.mp4
  existe: STOP workflow.
- Step user-gated sin approval: STOP, pedir approval.
- Transcription garbage y no modelo-mayor fallback viable: STOP, refuse (no
  fabricated captions).
- Matting unavailable y no fallback viable: STOP, marcar `coverage_gap`.
- Source burned-in captions: STOP, refuse (decision gate).
- Sin brief (router no despachó): STOP, rutcea via `content-os-router`.

## Done

Captioned `renders/final.mp4` (footage untouched + captions composited) =
`RENDERED_DRAFT`. Workflow auditable, gates pasados, capabilities delegadas,
render-path offline-first + deterministic + seek-safe heredados.
`READY`/publicación bloquea gates humanos G13-G17 (manuales por diseño).
