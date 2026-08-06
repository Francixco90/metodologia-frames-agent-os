# Steps receta — content-os-embedded-captions

Receta detallada de los 7 steps del orquestador. SKILL.md mantiene el router (step + gate +
puntero); este reference contiene el "cómo" completo. Governaado por checker (required) +
package_manifest_sha256.

## Step 0: Setup

Brief confirmado por router. Decision gate: probe clip. Rechazar bad clips. Pre-flight
probes (shot-cut, letterbox, luminance, identity recommendation). Resolver project dir
(`videos/<subject>-captions/`). Escribir `workflow-state.yml` (project, route,
capability_map, mode draft, identity draft, vo_mode transcribed, has_script false, footage
true, offline true). Gate: clip accepted + state file + probes done.

## Step 1: Prepare (matte ∥ transcribe ∥ audio-envelope → safe-zones)

Correr en paralelo via `content-os-media`:

- **Matte** (subject segmentation): ffmpeg bg-removal local default / remote opt-in
  auth-gated. Output `frames_fg/`.
- **Transcribe**: whisper.cpp offline default (word-level timings) / WhisperX remote opt-in.
  Output `transcript.json`. Sanity-read: si no parsea como lenguaje, probar modelo mayor,
  else refuse.
- **Audio-envelope**: RMS per frame (hero amplitude coupling). Output `audio-envelope.json`.
- **Safe-zones**: silhouette abutment zones, heroAnchor, heroBands, palette/optics/lighting.
  Output `safe-zones.json`.

Gate: matte + transcript + envelope + safe-zones listos (o remote opt-in declarado con auth).

## Step 2: Plan (pick identity + caption plan)

Pick UNA identity del catálogo. Recomiendas con one-line why; user elige (autonomous: tú
eliges, state the why). Clasificar transcript en drop/rail/embed. Author caption plan JSON
(`plan.json` standard/cinematic, `theme.json` theme): thought-blocks (2-5 words por clause
boundary), plane per block, ≤1 hero por block, `hero: true` marcado. Gate: identity picked +
caption plan authored + drop/rail/embed classified.

## Step 3: Design (caption groups, planes, hero)

Designar planes contra `safe-zones.json` (narration in hugLeft/hugRight, hero en
heroAnchor/heroBands.best ~30-55% occluded). Composition craft: planes & clean-zone
anchoring, zone coherence, climax pop, edge-breathing, occlusion 3-step judgement,
accumulation/persistence (ver `references/caption-model.md`). Finalizar `shot-plan.json`.
Gate: shot-plan final + planes chosen + hero declared.

## Step 4: Build (reuse-first)

Build `compositions/index.html` via `content-os-core` contract (seek-safe GSAP,
`window.__timelines`, `class="clip"` + stable ids, `tl.seek(0)`, deterministic). Caption
tracks: embed track (behind subject, matte occlusion), rail track (front). Reuse-first:
catalog caption blocks via `content-os-registry` + customize in place; hand-author solo
gaps. Composite layer order: footage frame → embed caption → matte (subject) → rail caption
(front). Gate: `index.html` built + honors contract + layer order declared.

## Step 5: Verify (preview + Visual QA + gates)

`content-os-keyframes` lint (pose + seek-safe) + `content-os-core` check. Preview frames:
composite caption layers at seek-time + real video frame + matte occlusion + rail overlay =
faithful preview (~2s/frame, no render). Visual QA checklist (`references/visual-qa.md`):
washout, text-on-text, reading order, hero presence, balance + 5 positive checks. Gates:
timing (word timings match transcript within 80ms), occlusion+hero (face ≥30% uncovered per
0.3s), overflow (captions on-frame), contrast (WCAG), hand-off (no overlap time+region). Una
repair pass in-place, rerun failed gate. Gate: lint + check + preview + gates pass.

## Step 6: Finalize / Approve + Render

User review (user-gated). Preguntar: "preview first, or render?" Si preview, abrir previews,
volver al mismo gate tras revisions. Render solo tras explicit render answer: extract
footage frames (FFmpeg) → render caption layers (Playwright HTML→frames) → composite (FFmpeg:
footage + embed + matte + rail) → `renders/final.mp4`. Verificar output exists, non-empty,
duration match footage. Gate: checks pass + user approval + final.mp4 exists.