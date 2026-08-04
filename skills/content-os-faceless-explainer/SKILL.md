---
name: content-os-faceless-explainer
description: This skill should be used when the user asks to "turn an article or notes into a faceless explainer video", "explain a topic with invented visuals", "make a concept breakdown video from text", "build a how-to explainer from a brief", or "create a listicle video with no footage".
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Orchestrates content-os-core (HTML→MP4 adapter), content-os-animation (motion), content-os-keyframes (pose), content-os-creative (brand/story/pacing), content-os-media (offline TTS/audio), content-os-registry (blocks). Faceless = every visual invented, no capture, no footage. Output RENDERED_DRAFT.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Content OS Faceless Explainer

Orquestador source→video: texto (articulo, notes, topic, brief) → faceless
explainer video. **Faceless** = todo visual es inventado (typography, abstract
graphics, diagrams, data-viz). No capture, no footage, no site. Adaptado de
`faceless-explainer` (vendor, referencia, Apache 2.0) al arquitectura local
fail-closed + hash-bound + offline-first.

Diferencia con el vendor: no `npx hyperframes` CLI. El render lo hace
`content-os-core` (HTML→MP4 adapter, Playwright + FFmpeg). Media via
`content-os-media` (offline cascade: Piper/Coqui TTS, whisper.cpp; remoto
opt-in auth-gated). Design via `content-os-creative` (brand/pacing/story). Motion
via `content-os-animation` + `content-os-keyframes`. Bloques via
`content-os-registry`. El router (`content-os-router`) despacha a este workflow.

Eres el **orchestrator**. Trabaja en `videos/<project>/`. Corre steps en orden,
pasa cada gate antes de continuar. Steps user-gated: Step 0, Step 3, Step 6.
Delega design/motion a capabilities; no dupliques rules aquí.

## Preflight (siempre)

1. Confirmar route: `content-os-router` despachó con `route:
content-os-faceless-explainer` + `capability_map[]` en el `intent-brief.jsonl`.
   Sin brief, rutcea primero via el router.
2. Verificar `content-os-core` HTML composition contract (`data-*` timing,
   seekable GSAP, framework-owned media). Sin contract, no build.
3. Verificar `content-os-media` offline cascade disponible (Piper/Coqui TTS local
   default; remoto opt-in). Sin TTS local y sin opt-in remoto, marcar
   `coverage_gap` o silent (`music: none` + no SCRIPT).
4. Correr `scripts/workflow-audit.mjs <project-state>` antes de avanzar gates. Fails
   closed si un step sin gate pasado o step fuera de orden.

## Default: texto → faceless explainer

```bash
node <SKILL_DIR>/scripts/workflow-audit.mjs videos/<project>/workflow-state.yml --out <dir>
```

Workflow: Step 0 setup → Step 1 brief (no capture) → Step 2 design system →
Step 3 storyboard/script → Step 3.1 audio → Step 4 visual design → Step 5 build
frames → Step 6 finalize/render. Cada step tiene gate. Output
`renders/video.mp4` = `RENDERED_DRAFT`.

## Routing (delegate to capabilities)

| Need                                              | Capability             |
| ------------------------------------------------- | ---------------------- |
| Composition contract, HTML→MP4 render adapter     | `content-os-core`      |
| Motion rules, scene blueprints, transitions       | `content-os-animation` |
| Seek-safe GSAP, pose contract, keyframe lint      | `content-os-keyframes` |
| Brand, palette, typography, story spine, pacing   | `content-os-creative`  |
| TTS, audio, BGM (offline cascade + remoto opt-in) | `content-os-media`     |
| Reusable blocks + components                      | `content-os-registry`  |

## Workflow Contract (ground truth)

1. **Orchestrator, no rules.** Este workflow orquesta steps + gates. Design y
   motion rules viven en capabilities. No dupliques.
2. **Faceless = invented visuals.** No capture, no footage, no asset inventory.
   Step 1 es synthetic (`visible-text.txt` + `tokens.json`). Todo visual se
   inventa en Step 4-5.
3. **Step-gated.** Cada step tiene gate. Sin gate pasado, no avanzas. Steps
   user-gated (0, 3, 6) pausan para approval.
4. **Delega capabilities on-demand.** Carga solo lo que el step activo necesita.
   Capabilities nunca son owners del deliverable; el workflow sí.
5. **Offline-first.** TTS/audio via `content-os-media` offline cascade default.
   Remoto (HeyGen/OpenAI) opt-in auth-gated, fail-closed sin creds. No network en
   render path.
6. **Deterministic.** Mismo brief + mismo design + mismo frame → mismo render.
   Sin `Date.now()`/`Math.random()`/`new Date()` en compositions (hereda core).
7. **Seek-safe.** GSAP `paused: true`, scrubbed a frame `t` (hereda
   `content-os-animation`). No `repeat: -1`, no relative `+=`, no CSS `transition:`
   en animated elements.
8. **RENDERED_DRAFT != HUMAN_APPROVED.** `renders/video.mp4` es `RENDERED_DRAFT`.
   `READY`/publicación requiere gates humanos G13-G17 (manuales por diseño).

## Steps (summary)

### Step 0: Setup

Brief confirmado por router. Crear `videos/<project>/`. Escribir
`workflow-state.yml` (project, route, capability_map, step states). Mostrar
media status (offline TTS disponible o coverage_gap). Gate: project init +
state file.

### Step 1: Brief (no capture)

Guardar texto verbatim en `capture/extracted/visible-text.txt`. Synthetic
`tokens.json` (`title`, `description`, `colors: []`, `fonts: []`). No
`npx capture` (no URL). Gate: visible-text + tokens + topic/audience en una
frase.

### Step 2: Design System

`content-os-creative` frame preset → `frame.md` + caption skin. Brand tokens
remix (si user dio colors/fonts). Gate: `frame.md` from preset, preset
recorded.

### Step 3: Storyboard + Script

`content-os-creative` story-spine + `references/story-design.md` →
`STORYBOARD.md` + `SCRIPT.md` (si narration). Review loop plan pass
(user-gated). Gate: storyboard con fields + user approval.

### Step 3.1: Audio

`content-os-media` TTS (offline Piper/Coqui default; remoto opt-in) +
transcription + BGM. Background. Silent si `music: none` + no SCRIPT. Gate:
audio job started o silent marker.

### Step 4: Frame Visual Design

`references/visual-design.md` + `content-os-animation` blueprints → time-coded
shot sequence per frame en `STORYBOARD.md`. Invented `focal`/`roles`. Gate:
cada frame con shot sequence paced a VO + `## Video direction`.

### Step 5: Build Frames

Build `compositions/frames/NN-*.html` via `content-os-core` contract (seek-safe
GSAP, `window.__timelines`). Assemble `index.html`. Captions via
`content-os-media`. Reusable blocks via `content-os-registry` si aplican.
Gate: every frame `animated` + `index.html` + captions built/skipped.

### Step 6: Finalize

Transitions inject + `content-os-keyframes` lint + `content-os-core` check +
snapshot. User review (user-gated). Render `renders/video.mp4` via
`content-os-core` HTML→MP4 adapter. Gate: checks pass + user approval + MP4
exists.

## Critical Constraints

- No `Date.now()`/`Math.random()`/`new Date()`/`performance.now()` en
  compositions (hereda `content-os-core`).
- No `fetch`/`setTimeout`/`setInterval` en compositions (hereda core).
- No external assets / network / Google Fonts CDN en frames (offline-first).
- No `repeat: -1` / relative `+=` / CSS `transition:` en animated elements
  (hereda `content-os-animation` + `content-os-keyframes`).
- No capture, no footage, no asset inventory (faceless).
- Sin gate pasado, no avanzas. Steps user-gated pausan.
- `renders/video.mp4` = `RENDERED_DRAFT`, no `HUMAN_APPROVED`.

## Stop rules

- Workflow auditable (`workflow-audit.mjs` PASS), todos gates pasados, MP4
  existe: STOP workflow.
- Step user-gated sin approval: STOP, pedir approval.
- TTS no disponible (no offline, no opt-in remoto) y no silent marker: STOP,
  marcar `coverage_gap` o silent.
- Sin brief (router no despachó): STOP, rutcea via `content-os-router`.

## Done

Faceless explainer video `renders/video.mp4` = `RENDERED_DRAFT`. Workflow
auditable, gates pasados, capabilities delegadas, offline-first + deterministic

- seek-safe heredados. `READY`/publicación bloquea gates humanos G13-G17
  (manuales por diseño).
