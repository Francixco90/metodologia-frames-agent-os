---
name: content-os-embedded-captions
description: This skill should be used when the user asks to "add captions to a video", "subtitle a talking-head clip", "embed captions behind the subject", "add cinematic captions", "burn in subtitles", "add VFX caption styling", "caption an explainer or voiceover video", or "add styled captions to an existing single-subject talking-head video without editing the footage".
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
compatibility: Orchestrates content-os-core (HTML→caption frames + composite adapter), content-os-animation (caption motion), content-os-keyframes (pose/lint), content-os-creative (brand/identity), content-os-media (transcription + matting, offline-default + remote opt-in auth-gated), content-os-registry (block reuse). Input = existing single-subject talking-head video (footage). Captions derived from footage speech. Output RENDERED_DRAFT (final.mp4, footage untouched + captions composited).
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Frames ContentOS Embedded Captions

Orquestador footage→captioned-video: añade captions a un talking-head existente **sin
editar el footage** (matte occlusion deja al sujeto cubrir embed tracks). Adaptado de
`embedded-captions` (vendor, Apache 2.0) a fail-closed + hash-bound + offline-first. No
`npx hyperframes` CLI. Transcription/matting via `content-os-media` (offline default;
remote opt-in auth-gated). Composition via `content-os-core` (HTML+GSAP → frames → FFmpeg).
Lint `content-os-keyframes`. Identity `content-os-creative`
+ `references/identity-catalog.md`.

Eres el **orchestrator**: step-gated orchestrator
(setup→prepare→plan→design→build→verify→finalize), trabaja en `videos/<project>/`, pasa
cada gate. User-gated: 0, 6. Delega a capabilities. Footage untouched; rail-first; hash-bound
via sha256 (registry + 4 lifecycle events); matte occlusion (content-os-media, offline +
remote opt-in); seek-safe (window.__timelines, paused: true, tl.seek(frame/fps));
offline-first render path.

## Caption model — rail + embed

Cada frase hablada es drop / rail / embed:

|         | Qué                                       | Cómo |
| ------- | ----------------------------------------- | ---- |
| `drop`  | filler — um/uh, tartamudeos, correcciones | no se muestra |
| `rail`  | default — contenido hablado (verbatim)    | lower-third subtitle, **en frente**, legible. Punch word puede tener `emphasis`. |
| `embed` | pico promovido — el headline beat         | palabra grande **detrás del sujeto** (matte occlusion), entrada + exit diseñados |

**Rail lleva la mayoría; embed es el pico escaso, ganado.** ≤1 hero por bloque, nunca dos
co-visibles, ≥ un beat de aire entre hero windows. Embedding every word → violación
`embed-overuse`. Explainer/voiceover = **Standard** (rail + embed climax); **Cinematic** =
pure embed (mood-over-verbatim); **Theme** = themed constitution (VFX-grade).

## Preflight (siempre)

1. Confirmar route: `content-os-router` despachó con `route: content-os-embedded-captions`
   + `capability_map[]` en `intent-brief.jsonl`. Sin brief, rutcea primero.
2. **Decision gate — RUN FIRST.** Probe clip (`ffprobe` + sample frames 20/50/80% + 1fps
   contact sheet). Rechazar si: multi-speaker/hard cuts, sin sujeto, <3s, sin speech, face
   nunca visible, **burned-in captions ya**, transcript garbage (sanity-read antes de
   authoring), busy handheld (matte flickers). Split multi-shot antes de aplicar.
3. Pre-flight probes: shot-cut (trim antes del cut), letterbox/pillarbox (constrain
   placement), luminance (caption luma → scrim/opaque), identity rec by tone.
4. Verificar `content-os-core` contract + `content-os-media` transcription/matting (offline
   default; remote opt-in auth-gated, fail-closed).
5. Correr `scripts/workflow-audit.mjs <project-state>` antes de avanzar gates.

## Default: talking-head footage → captioned video

```bash
node <SKILL_DIR>/scripts/workflow-audit.mjs videos/<project>/workflow-state.yml --out <dir>
```

7 steps gateados (ver tabla abajo). Cada step pasa su gate antes de avanzar. Output
`renders/final.mp4` = `RENDERED_DRAFT`.

## Modes

| Mode        | Caption model                                  | When |
| ----------- | ---------------------------------------------- | ---- |
| `standard`  | rail (default) + embed climax                  | explainer / voiceover / must-read (default) |
| `cinematic` | pure embed (no rail, every word)               | poetic / social / mood-over-verbatim |
| `theme`     | themed constitution (body × hero × fx × plate) | VFX-grade ("炸", "特效", named worlds) |

**Rail-first for talking-head/explainer.** Don't embed the whole transcript. Embed is
scarce, earned.

## Identity catalog

Identidades del catálogo en `references/identity-catalog.md` (DNA registry 10 + themes).
User elige UNA (`identity` field); engine/compiler/authoring por lookup. **Nunca surfaces
"Standard vs Cinematic vs Theme" como pregunta** — son backend names. Recomiendas con
one-line why; user elige. Unsure → `anchor` (rail-surface, words read, scene safe).

## Routing (delegate to capabilities)

| Need | Capability |
| ---- | ---------- |
| Composition contract, HTML→caption frames, composite | `content-os-core` |
| Caption motion vocabulary, transitions | `content-os-animation` |
| Pose contract, lint, snapshot | `content-os-keyframes` |
| Brand tokens, identity, layout | `content-os-creative` |
| Transcription + subject matting (offline + remote opt-in) | `content-os-media` |
| Reusable caption blocks (rail, embed, lower-thirds) | `content-os-registry` |

## Workflow Contract (ground truth)

1. **Orchestrator, no rules.** Design/motion rules viven en capabilities. No dupliques.
2. **Footage untouched.** Captions = única adición. `graded_footage: true` = `graded-footage`
   violación (never grade/recolor/duotone/vignette el a-roll). Matte solo oculta embed tracks;
   no covering/inpainting.
3. **Rail-first.** `embed_all: true` / `rail_mode: none` = violación `embed-overuse`. ≤1 embed
   per beat, nunca dos co-visibles, ≥ un beat de aire.
4. **Transcription-derived.** `has_script: false` (transcript derivado, no autoría).
   `vo_mode: transcribed` (VO = speech del footage).
5. **Step-gated.** Sin gate, no avanzas. User-gated (0, 6) pausan para approval. Step 1
   corre matte ∥ transcribe ∥ audio-envelope.
6. **Delega on-demand.** Carga solo lo que el step activo necesita.
7. **Render-path offline-first.** Footage + caption + composite offline. Único network:
   Step 1 (transcription + matting remote opt-in auth-gated).
8. **Deterministic + seek-safe.** Mismo footage+plan+frames → mismo render. Sin
   `Date.now()`/`Math.random()`/`new Date()`. GSAP `paused: true`, frame `t`. No
   `repeat: -1`/`+=`/CSS `transition:` en animated elements.
9. **RENDERED_DRAFT != HUMAN_APPROVED.** `finalize` sin render = `no-render` violación.
   `READY`/publicación requiere gates humanos G13-G17.

## Non-negotiables (hereda vendor)

- **Face nunca 100% cubierto** — every 0.3s window, face bbox ≥30% uncovered.
- **WCAG contrast** — final render lints; fix palette si falla.
- **Word timings match transcript within 80ms** — off-beat destruye la ilusión.
- **Each caption ≥ 0.5s on screen** — shorter = unreadable.
- **Captions on-frame** — overflow gate (intentional bleed única excepción).
- **No two groups overlap in time AND region** — separation / handoff / layered
  (`allow_overlap`).

## Steps (router — detail en `references/steps-receta.md`)

| Step | Acción | Gate |
| ---- | ------ | ---- |
| 0 Setup | Router brief. Decision gate: probe clip, rechazar bad clips. Pre-flight probes. Escribir `workflow-state.yml`. | clip + state + probes |
| 1 Prepare | Matte ∥ transcribe ∥ audio-envelope ∥ safe-zones via `content-os-media` (4 outputs; sanity-read transcript). | 4 outputs (o remote opt-in auth) |
| 2 Plan | Pick identity del catálogo; clasificar drop/rail/embed; author `plan.json`/`theme.json` (thought-blocks, ≤1 hero, `hero: true`). | identity + plan + classified |
| 3 Design | Planes vs `safe-zones.json`; craft anchoring/coherence/climax/occlusion (`references/caption-model.md`). Finalizar `shot-plan.json`. | shot-plan + planes + hero |
| 4 Build | `index.html` via `content-os-core` (seek-safe GSAP). Tracks embed+rail. Reuse via `content-os-registry`. Layer: footage→embed→matte→rail. | index.html + contract + layer order |
| 5 Verify | Lint (`content-os-keyframes`)+check. Preview composite. Visual QA (`references/visual-qa.md`). Gates: timing 80ms, occlusion, overflow, contrast, hand-off. | lint + check + preview + gates |
| 6 Finalize | User-gated. Render: FFmpeg extract→Playwright frames→composite→`renders/final.mp4`. | checks + approval + final.mp4 |

## Stop rules

- `workflow-audit.mjs` PASS + todos gates + final.mp4 existe: STOP.
- Step user-gated sin approval: STOP, pedir approval.
- Transcription garbage sin modelo-mayor fallback: STOP, refuse (no fabricated captions).
- Matting unavailable sin fallback: STOP, `coverage_gap`.
- Source burned-in captions: STOP, refuse (decision gate).
- Sin brief (router no despachó): STOP, rutcea via `content-os-router`.

## Done

Captioned `renders/final.mp4` (footage untouched + captions composited) = `RENDERED_DRAFT`.
Workflow auditable, gates pasados, capabilities delegadas, render-path offline-first +
deterministic + seek-safe heredados. `READY`/publicación bloquea gates G13-G17.