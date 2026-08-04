---
name: content-os-product-launch-video
description: This skill should be used when the user asks to "turn a product or marketing URL into a launch or promo video", "make a SaaS promo or feature-reveal video", "build a product demo or app launch video", "create a company launch video from a brief", or "make a site tour or showcase video from a captured website".
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Orchestrates content-os-core (HTML→MP4 adapter), content-os-animation (motion), content-os-keyframes (pose), content-os-creative (brand/preset/story/pacing), content-os-media (offline TTS/audio), content-os-registry (blocks). Input = product URL / pasted script / brief. Capture via Playwright. No footage. Output RENDERED_DRAFT.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Content OS Product Launch Video

Orquestador source→video: producto o marketing URL / pasted script / brief → product
launch / promo video (SaaS promos, feature reveals, product demos, app y company
launches, site tours/showcases). Adaptado de `product-launch-video` (vendor,
referencia, Apache 2.0) al arquitectura local fail-closed + hash-bound +
render-path offline-first.

Diferencia con el vendor: no `npx hyperframes` CLI, no `npx hyperframes
capture`. El capture lo hace **Playwright** (1.61.1 pinned, ya en el repo para
carousel screenshots) → `capture/extracted/` + `capture/assets/` +
`capture/screenshots/`. El render lo hace `content-os-core` (HTML→MP4 adapter,
Playwright + FFmpeg). Media via `content-os-media` (offline cascade: Piper/Coqui
TTS, whisper.cpp; remoto opt-in auth-gated). Design via `content-os-creative`
(frame preset, brand tokens remix, story-spine). Motion via `content-os-animation`

- `content-os-keyframes`. Bloques via `content-os-registry`. El router
  (`content-os-router`) despacha a este workflow.

Eres el **orchestrator**. Trabaja en `videos/<project>/`. Corre steps en orden,
pasa cada gate antes de continuar. Steps user-gated: Step 0, Step 3, Step 6.
Delega design/motion a capabilities; no dupliques rules aquí.

## Preflight (siempre)

1. Confirmar route: `content-os-router` despachó con `route:
content-os-product-launch-video` + `capability_map[]` en el `intent-brief.jsonl`.
   Sin brief, rutcea primero via el router.
2. Clasificar input: URL explícita → capture path. Script/brief pasted →
   no-capture path (save `user_script.txt`). Brand name only → WebSearch confirmar
   URL una línea, luego crawl. Sin URL/site → no-capture path.
3. Verificar `content-os-core` HTML composition contract (`data-*` timing,
   seekable GSAP, framework-owned media). Sin contract, no build.
4. Verificar `content-os-media` offline cascade disponible (Piper/Coqui TTS local
   default; remoto opt-in). Sin TTS local y sin opt-in remoto, marcar
   `coverage_gap` o silent (`music: none` + no SCRIPT).
5. Correr `scripts/workflow-audit.mjs <project-state>` antes de avanzar gates. Fails
   closed si un step sin gate pasado o step fuera de orden.

## Default: product URL / brief → launch video

```bash
node <SKILL_DIR>/scripts/workflow-audit.mjs videos/<project>/workflow-state.yml --out <dir>
```

Workflow: Step 0 setup → Step 1 capture (Playwright, no `npx capture`) → Step 2
design system → Step 3 storyboard/script → Step 3.1 audio → Step 4 visual design
→ Step 5 build frames → Step 6 finalize/render. Cada step tiene gate. Output
`renders/video.mp4` = `RENDERED_DRAFT`.

## Routing (delegate to capabilities)

| Need                                              | Capability             |
| ------------------------------------------------- | ---------------------- |
| Composition contract, HTML→MP4 render adapter     | `content-os-core`      |
| Motion rules, scene blueprints, transitions       | `content-os-animation` |
| Seek-safe GSAP, pose contract, keyframe lint      | `content-os-keyframes` |
| Brand, frame preset, story spine, pacing          | `content-os-creative`  |
| TTS, audio, BGM (offline cascade + remoto opt-in) | `content-os-media`     |
| Reusable blocks + components                      | `content-os-registry`  |

## Workflow Contract (ground truth)

1. **Orchestrator, no rules.** Este workflow orquesta steps + gates. Design y
   motion rules viven en capabilities. No dupliques.
2. **Capture es Step 1 (URL input), no fabricación.** URL explícita → capture via
   Playwright → `capture/extracted/{tokens,visible-text,asset-descriptions}` +
   `capture/assets/` + `capture/screenshots/`. `capture/BLOCKED.md` = hard stop:
   reportar razón, no consumir partial screenshots/DOM/assets, no fabricar
   synthetic no-capture fallback. Script/brief sin URL → no-capture path (tokens
   vacíos, visible-text = brief, asset-descriptions = none). `capture_blocked:
true` en state = violación.
3. **Step-gated.** Cada step tiene gate. Sin gate pasado, no avanzas. Steps
   user-gated (0, 3, 6) pausan para approval.
4. **Delega capabilities on-demand.** Carga solo lo que el step activo necesita.
   Capabilities nunca son owners del deliverable; el workflow sí.
5. **Render-path offline-first.** Compositions (frames) offline/deterministic.
   Step 1 capture usa Playwright (único network step, dado un URL). TTS/audio via
   `content-os-media` offline cascade default. Remoto opt-in auth-gated,
   fail-closed sin creds. No network en render path (Step 5-6). State mismo es
   offline (no https URLs en state).
6. **Deterministic.** Mismo URL + mismo design + mismo frame → mismo render.
   Sin `Date.now()`/`Math.random()`/`new Date()` en compositions (hereda core).
7. **Seek-safe.** GSAP `paused: true`, scrubbed a frame `t` (hereda
   `content-os-animation`). No `repeat: -1`, no relative `+=`, no CSS `transition:`
   en animated elements.
8. **RENDERED_DRAFT != HUMAN_APPROVED.** `renders/video.mp4` es `RENDERED_DRAFT`.
   `finalize` gate passed sin render = `no-render` violación. `READY`/publicación
   requiere gates humanos G13-G17 (manuales por diseño).

## Steps (summary)

### Step 0: Setup

Brief confirmado por router. Clasificar input (URL/script/brief). Resolver project
dir (`videos/<brand-or-domain>/`, ej `acme-promo`, nunca workspace name o
timestamp). Escribir `workflow-state.yml` (project, route, capability_map,
source_type, source_ref normalizado, step states). Mostrar media status. Gate:
project init + state file + input classified.

### Step 1: Capture assets (Playwright, no `npx capture`)

URL → Playwright capture (default post-navigation budget; `--capture-budget` si
caller tiene deadline menor). Inspeccionar result inmediatamente: non-zero exit,
`ok: false`, o `capture/BLOCKED.md` = **hard stop** (reportar razón, no consumir
partial, no fabricar fallback). Offline transform → `capture/extracted/{tokens.json
(brand colors/fonts), visible-text.txt (site text / brief), asset-descriptions.md
(asset inventory)}` + `capture/assets/` + `capture/screenshots/`. Vision captioning
opcional (sin vision key, DOM context). No-capture path (script/brief sin URL):
tokens vacíos, visible-text = brief, asset-descriptions = none. Para site
tour/show-it-as-is: captured screenshots son visual source of truth (no rebuild
page in HTML; overlay real assets o animate viewport over `full-page.png`).
Gate: capture JSON `ok: true` (o no-capture path), extracted/{tokens,visible-text,
asset-descriptions} + assets/ existen, brand en una frase clara.

### Step 2: Design System

`content-os-creative` frame preset (brief nombra `style_preset` si user pickió;
sino judgment call) → `frame.md` + caption skin. Brand tokens remix (capture
tokens → preset color keys por role; fonts swapped). tokens vacíos → preset
palette propia, complete design. Gate: `frame.md` from preset + preset recorded.

### Step 3: Storyboard + Script

`content-os-creative` story-spine + `references/story-design.md` (story
blueprint, hook, persuasion, beats, VO_MODE, asset choices) → `STORYBOARD.md` +
`SCRIPT.md` (si narration). `asset_candidates` de `asset-descriptions.md`
(canonical inventory), no raw `capture/assets/`. Review loop plan pass
(user-gated). Gate: storyboard con fields + asset_candidates + user approval.

### Step 3.1: Audio

`content-os-media` TTS (offline Piper/Coqui default; remoto opt-in) +
transcription + BGM. Background. Silent si `music: none` + no SCRIPT. Gate: audio
job started o silent marker.

### Step 4: Frame Visual Design

`references/visual-design.md` + `content-os-animation` blueprints → time-coded
shot sequence per frame en `STORYBOARD.md`. Para site tour: real screenshots
como `focal`/`asset_candidates` (no rebuild). Gate: cada frame con shot sequence
paced a VO + `## Video direction`.

### Step 5: Build Frames

Build `compositions/frames/NN-*.html` via `content-os-core` contract (seek-safe
GSAP, `window.__timelines`). Stage captured assets via `content-os-media`.
Reusable blocks via `content-os-registry`. Assemble `index.html`. Captions via
`content-os-media`. Gate: every frame `animated` + `index.html` + captions
built/skipped.

### Step 6: Finalize

Transitions inject + `content-os-keyframes` lint + `content-os-core` check +
snapshot. User review (user-gated). Render `renders/video.mp4` via
`content-os-core` HTML→MP4 adapter. Gate: checks pass + user approval + MP4
exists.

## Critical Constraints

- step-gated orchestrator (setup→capture→design→storyboard→audio→visual-design→build-frames→finalize); capture via playwright (Step 1 only); hash-bound via sha256 (registry + 4 lifecycle events).
- No `Date.now()`/`Math.random()`/`new Date()`/`performance.now()` en
  compositions (hereda `content-os-core`).
- No `fetch`/`setTimeout`/`setInterval` en compositions (hereda core).
- No external assets / network / Google Fonts CDN en frames (render-path
  offline-first). Único network step: Step 1 capture via Playwright.
- No `repeat: -1` / relative `+=` / CSS `transition:` en animated elements
  (hereda `content-os-animation` + `content-os-keyframes`).
- No fabricar capture si `capture/BLOCKED.md`. Reportar razón, STOP.
- No rebuild full website in HTML para site tour (usar captured screenshots).
- No footage (real video footage). Captured screenshots son assets, no footage.
- Sin gate pasado, no avanzas. Steps user-gated pausan.
- `renders/video.mp4` = `RENDERED_DRAFT`, no `HUMAN_APPROVED`.

## Stop rules

- Workflow auditable (`workflow-audit.mjs` PASS), todos gates pasados, MP4
  existe: STOP workflow.
- Step user-gated sin approval: STOP, pedir approval.
- `capture/BLOCKED.md` o capture `ok: false`: STOP, reportar razón, no fabricar.
- TTS no disponible y no silent marker: STOP, marcar `coverage_gap` o silent.
- Sin brief (router no despachó): STOP, rutcea via `content-os-router`.

## Done

Product launch / promo video `renders/video.mp4` = `RENDERED_DRAFT`. Workflow
auditable, gates pasados, capabilities delegadas, render-path offline-first +
deterministic + seek-safe heredados. `READY`/publicación bloquea gates humanos
G13-G17 (manuales por diseño).
