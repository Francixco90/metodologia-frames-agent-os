---
name: content-os-pr-to-video
description: This skill should be used when the user asks to "turn a GitHub pull request into a code-change explainer video", "make a PR walkthrough video from a diff", "build a changelog or feature-reveal video from a PR", "create a fix-explainer or refactor-walkthrough video from a PR URL or owner/repo#N", or "render a code-change explainer from a merged or open PR".
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
compatibility: Orchestrates content-os-core (HTML→MP4 adapter), content-os-animation (motion), content-os-keyframes (pose), content-os-creative (brand/story/pacing, code-editorial preset), content-os-media (offline TTS/audio), content-os-registry (code-* blocks). Input is a code change (PR via gh), not a website. No capture, no footage. Output RENDERED_DRAFT.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Frames ContentOS PR to Video

Orquestador source→video: GitHub pull request (URL, `owner/repo#N`, o "this PR"
en un repo checked-out) → code-change explainer video. El input es un **cambio de
código** (leído via `gh`), no un website. No capture, no footage. Adaptado de
`pr-to-video` (vendor, referencia, Apache 2.0) al arquitectura local fail-closed +
hash-bound + render-path offline-first.

Diferencia con el vendor: no `npx hyperframes` CLI. El render lo hace
`content-os-core` (HTML→MP4 adapter, Playwright + FFmpeg). Media via
`content-os-media` (offline cascade: Piper/Coqui TTS, whisper.cpp; remoto
opt-in auth-gated). Design via `content-os-creative` (code-editorial preset, brand,
story-spine). Motion via `content-os-animation` + `content-os-keyframes`. Code
beats via `content-os-registry` `code-*` blocks. El router (`content-os-router`)
despacha a este workflow.

Eres el **orchestrator**. Trabaja en `videos/<project>/`. Corre steps en orden,
pasa cada gate antes de continuar. Steps user-gated: Step 0, Step 3, Step 6.
Delega design/motion a capabilities; no dupliques rules aquí.

## Preflight (siempre)

1. Confirmar route: `content-os-router` despachó con `route:
content-os-pr-to-video` + `capability_map[]` en el `intent-brief.jsonl`.
   Sin brief, rutcea primero via el router.
2. Verificar PR ref: URL, `owner/repo#N`, o "this PR" en un checked-out repo.
   Sin PR ref, no build.
3. Verificar `content-os-core` HTML composition contract (`data-*` timing,
   seekable GSAP, framework-owned media). Sin contract, no build.
4. Verificar `content-os-media` offline cascade disponible (Piper/Coqui TTS local
   default; remoto opt-in). Sin TTS local y sin opt-in remoto, marcar
   `coverage_gap` o silent (`music: none` + no SCRIPT).
5. Correr `scripts/workflow-audit.mjs <project-state>` antes de avanzar gates. Fails
   closed si un step sin gate pasado o step fuera de orden.

## Default: GitHub PR → code-change explainer

```bash
node <SKILL_DIR>/scripts/workflow-audit.mjs videos/<project>/workflow-state.yml --out <dir>
```

Workflow: Step 0 setup → Step 1 ingest (gh, no capture web) → Step 2 design system
→ Step 3 storyboard/script → Step 3.1 audio → Step 4 visual design → Step 5 build
frames → Step 6 finalize/render. Cada step tiene gate. Output
`renders/video.mp4` = `RENDERED_DRAFT`.

## Routing (delegate to capabilities)

| Need                                              | Capability             |
| ------------------------------------------------- | ---------------------- |
| Composition contract, HTML→MP4 render adapter     | `content-os-core`      |
| Motion rules, scene blueprints, transitions       | `content-os-animation` |
| Seek-safe GSAP, pose contract, keyframe lint      | `content-os-keyframes` |
| Brand, code-editorial preset, story spine, pacing | `content-os-creative`  |
| TTS, audio, BGM (offline cascade + remoto opt-in) | `content-os-media`     |
| `code-*` blocks (diff, morph, typing, reveal)     | `content-os-registry`  |

## Workflow Contract (ground truth)

1. **Orchestrator, no rules.** Este workflow orquesta steps + gates. Design y
   motion rules viven en capabilities. No dupliques.
2. **Code change input, no capture.** Input es un PR (cambio de código) leído via
   `gh` en Step 1. No website capture, no footage, no asset inventory. Los únicos
   real assets son los contributor avatars (`assets/<login>.png`, best-effort)
   para el credits close.
3. **Step-gated.** Cada step tiene gate. Sin gate pasado, no avanzas. Steps
   user-gated (0, 3, 6) pausan para approval.
4. **Delega capabilities on-demand.** Carga solo lo que el step activo necesita.
   Capabilities nunca son owners del deliverable; el workflow sí.
5. **Render-path offline-first.** Compositions (frames) son offline/deterministic.
   Step 1 ingest usa `gh` (el único network step, read-only, deterministic dado un
   PR ref). TTS/audio via `content-os-media` offline cascade default. Remoto
   (HeyGen/OpenAI) opt-in auth-gated, fail-closed sin creds. No network en render
   path (Step 5-6).
6. **Deterministic.** Mismo PR ref + mismo design + mismo frame → mismo render.
   Sin `Date.now()`/`Math.random()`/`new Date()` en compositions (hereda core).
7. **Seek-safe.** GSAP `paused: true`, scrubbed a frame `t` (hereda
   `content-os-animation`). No `repeat: -1`, no relative `+=`, no CSS `transition:`
   en animated elements.
8. **RENDERED_DRAFT != HUMAN_APPROVED.** `renders/video.mp4` es `RENDERED_DRAFT`.
   `READY`/publicación requiere gates humanos G13-G17 (manuales por diseño).

## Steps (summary)

### Step 0: Setup

Brief confirmado por router con PR ref. Resolver project dir (`videos/<pr-basename>/`,
ej `acme-sdk-pr-1842`, nunca workspace name o timestamp). Escribir
`workflow-state.yml` (project, route, capability_map, pr_ref normalizado, step
states). Mostrar media status (offline TTS disponible o coverage_gap). Gate:
project init + state file + PR ref captured.

### Step 1: Ingest (no web capture)

`gh` deterministic fetch: `capture/pr.json` + `capture/diff.patch` (large-PR-safe,
paginated `gh api` para no truncar files list a ~100). Offline transform →
`capture/extracted/{tokens.json (code-editorial palette), visible-text.txt (PR
brief: title, meta +N/-M across F files, people, body, commits, changed files,
representative diff hunks), people.json (contributors, bot-filtered,
avatarFile=assets/<login>.png)}`. Best-effort avatars (`gh api users/<login>`). Si
`gh` falla (auth/not-found/private), reportar stderr y STOP — no fabricar PR
contents. Gate: pr.json + diff.patch + extracted/{tokens,visible-text,people} +
change en una frase clara.

### Step 2: Design System

`content-os-creative` code-editorial preset (style fijo, nunca preguntado) →
`frame.md` + caption skin. Brand tokens remix (PR no tiene → code-editorial
palette propia, complete design). Gate: `frame.md` from code-editorial preset +
preset recorded.

### Step 3: Storyboard + Script

`content-os-creative` story-spine + `references/story-design.md` (PR archetypes:
changelog / feature-reveal / fix-explainer / refactor-walkthrough) →
`STORYBOARD.md` + `SCRIPT.md` (si narration). Narrative design, NO diff file-order.
Feature 2-4 real diff hunks (de `capture/diff.patch`), cada uno un snippet legible;
nombra el `code-*` block en el frame `scene`. Credits close (1-6 avatars). Review
loop plan pass (user-gated). Gate: storyboard con fields + user approval.

### Step 3.1: Audio

`content-os-media` TTS (offline Piper/Coqui default; remoto opt-in) +
transcription + BGM. Background. Silent si `music: none` + no SCRIPT. Gate: audio
job started o silent marker.

### Step 4: Frame Visual Design

`references/visual-design.md` + `references/code-vocabulary.md` +
`content-os-animation` blueprints → time-coded shot sequence per frame en
`STORYBOARD.md`. Code beat `focal` = el `code-*` block. `### Source excerpt` diff
hunk (12 líneas max) por code frame. Gate: cada frame con shot sequence paced a
VO + code frames nombran `code-*` block + `## Video direction`.

### Step 5: Build Frames

Build `compositions/frames/NN-*.html` via `content-os-core` contract (seek-safe
GSAP, `window.__timelines`). `code-*` blocks via `content-os-registry`. Assemble
`index.html`. Captions via `content-os-media`. Reusable blocks pre-installados
una vez antes de dispatch (race-free). Gate: every frame `animated` + `index.html`

- captions built/skipped.

### Step 6: Finalize

Transitions inject + `content-os-keyframes` lint + `content-os-core` check +
snapshot. User review (user-gated). Render `renders/video.mp4` via
`content-os-core` HTML→MP4 adapter. Gate: checks pass + user approval + MP4
exists.

## Stop rules

- Workflow auditable (`workflow-audit.mjs` PASS), todos gates pasados, MP4
  existe: STOP workflow.
- Step user-gated sin approval: STOP, pedir approval.
- `gh` falla (auth/not-found/private): STOP, reportar stderr, no fabricar PR.
- TTS no disponible (no offline, no opt-in remoto) y no silent marker: STOP,
  marcar `coverage_gap` o silent.
- Sin brief (router no despachó): STOP, rutcea via `content-os-router`.

## Done

Code-change explainer video `renders/video.mp4` = `RENDERED_DRAFT`. Workflow
auditable, gates pasados, capabilities delegadas, render-path offline-first +
deterministic + seek-safe heredados. `READY`/publicación bloquea gates humanos
G13-G17 (manuales por diseño).
