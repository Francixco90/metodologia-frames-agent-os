---
name: content-os-motion-graphics
description: This skill should be used when the user asks to "make a short motion graphic", "create a kinetic typography or text animation", "animate a stat count-up", "build a logo sting or brand lockup", "make a lower-third or social overlay", "animate a chart or data-viz hit", "make an animated map", "animate a tweet or news headline", or "create a short design-led unnarrated motion graphic (under 30s, no voice-over)".
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Orchestrates content-os-core (HTML→MP4/overlay adapter), content-os-animation (motion vocabulary), content-os-keyframes (pose/lint), content-os-creative (brand tokens/preset), content-os-media (asset resolve, optional music bed), content-os-registry (catalog blocks). Input = short design request (line, stat, logo, data, URL). Unnarrated. Output RENDERED_DRAFT (MP4 or transparent overlay).
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Content OS Motion Graphics

Orquestador source→video: short, design-led, **unnarrated** motion graphic donde
el motion es el mensaje — kinetic typography, stat count-up, chart/data-viz hit,
logo sting / brand lockup, lower-third / callout / social overlay, animated map,
animated tweet / news headline, webpage/UI animation, o asset-fusion (geometría
de un real image → chart). Usualmente <10s (hasta ~30s), sin narración ni
live-action. Adaptado de `motion-graphics` (vendor, referencia, Apache 2.0) al
arquitectura local fail-closed + hash-bound + render-path offline-first.

Diferencia con el vendor: no `npx hyperframes` CLI, no `npx hyperframes
init/add/lint/check/snapshot/render`. Render via `content-os-core` (HTML→MP4 o
overlay adapter, Playwright + FFmpeg). Lint via `content-os-keyframes` (pose
contract + seek-safe). Snapshots via `content-os-core`. Assets via
`content-os-media` (offline cascade; search remote opt-in auth-gated). Design via
`content-os-creative` (brand tokens, preset). Motion via `content-os-animation`

- `content-os-registry` (catalog blocks). El router (`content-os-router`)
  despacha a este workflow.

Este workflow es **autónomo por diseño** — a lo sumo una pregunta clarificadora
(`references/director.md`), luego build through verification sin review
intermedio. Una storyboard/companion session agrega poco a una pieza tan corta.
El render sigue user-gated (Step 6). **Asset-first**: decide la estrategia de
assets y sourcea real material _antes_ de diseñar el shot, luego diseña el shot
alrededor de lo que tienes, luego compose reusando catalog capabilities.

Eres el **orchestrator**. Trabaja en `videos/<project>/`. Corre steps en orden,
pasa cada gate antes de continuar. Steps user-gated: Step 0, Step 6. Delega
design/motion a capabilities; no dupliques rules aquí.

## Preflight (siempre)

1. Confirmar route: `content-os-router` despachó con `route:
content-os-motion-graphics` + `capability_map[]` en el `intent-brief.jsonl`.
   Sin brief, rutcea primero via el router.
2. Clasificar intent: ¿necesita search? (fork inicial). No → form category
   (kinetic-type, stat, charts, logo-reveal, lower-thirds, maps), content
   user-supplied, `asset_needs: []`. Sí → search plan (webpage, news, tweet,
   image); categoría confirmada por content type retornado en Step 2.
3. Verificar `content-os-core` HTML composition contract (`data-*` timing,
   seekable GSAP, framework-owned media). Sin contract, no build.
4. Verificar `content-os-media` asset resolve (offline cascade default; search
   remote opt-in auth-gated, fail-closed). Sin assets needed (form categories),
   skip Step 2.
5. Correr `scripts/workflow-audit.mjs <project-state>` antes de avanzar gates.
   Fails closed si un step sin gate pasado o step fuera de orden.

## Default: short design request → motion graphic

```bash
node <SKILL_DIR>/scripts/workflow-audit.mjs videos/<project>/workflow-state.yml --out <dir>
```

Workflow: Step 0 setup → Step 1 plan → Step 2 source (conditional, skip si
`asset_needs` vacío) → Step 3 design → Step 4 build → Step 5 verify → Step 6
finalize/render. Cada step tiene gate. Output `renders/video.mp4` (o overlay
`.webm`/`.mov`) = `RENDERED_DRAFT`.

## Categories

**Form categories — no search; user supplies content:**

| Category       | Intent                                         | Leans on                       |
| -------------- | ---------------------------------------------- | ------------------------------ |
| `kinetic-type` | punchy line / quote / title, motion-first text | `caption-*` blocks + animation |
| `stat`         | single hero number / count-up + ring           | count-up rules + stat-bars     |
| `charts`       | bar / line / pie / race / % from data          | `data-chart` block             |
| `logo-reveal`  | logo sting / brand lockup (user logo)          | `logo-outro` + svg-path-draw   |
| `lower-thirds` | name / title bars, callouts, social overlays   | `caption-*` + overlay blocks   |
| `maps`         | geographic motion — highlight, connect, zoom   | `us-map` / `world-map` family  |

**Search-driven categories — search first, then animate by content type:**

| Returned content | Category       | Animation                                          |
| ---------------- | -------------- | -------------------------------------------------- |
| webpage / link   | `webpage`      | webpage / UI animation (scroll, reveal, cursor)    |
| news article     | `news`         | headline reveal + source card + key-fact callouts  |
| tweet            | `tweet`        | animated tweet card                                |
| image / entity   | `asset-fusion` | asset geometry becomes the chart (diegetic fusion) |

## Routing (delegate to capabilities)

| Need                                           | Capability             |
| ---------------------------------------------- | ---------------------- |
| Composition contract, HTML→MP4/overlay adapter | `content-os-core`      |
| Motion vocabulary, blueprints, transitions     | `content-os-animation` |
| Pose contract, lint, snapshot                  | `content-os-keyframes` |
| Brand tokens, preset, layout                   | `content-os-creative`  |
| Asset resolve, optional music bed              | `content-os-media`     |
| Reusable catalog blocks + components           | `content-os-registry`  |

## Workflow Contract (ground truth)

1. **Orchestrator, no rules.** Este workflow orquesta steps + gates. Design y
   motion rules viven en capabilities. No dupliques.
2. **Unnarrated.** Motion-graphics NO tiene narración. `vo_mode: silent`, no
   SCRIPT.md, no TTS. `vo_mode` no-silent o script presente = violación
   `narration-in-motion-graphics`. Music bed opcional via `content-os-media`
   (background, no VO).
3. **Asset-first.** Decide asset strategy + source real material _antes_ de
   diseñar el shot (Step 1 plan → Step 2 source). Form categories: `asset_needs:
[]`, skip Step 2. Search-driven: resolve via `content-os-media` (search
   remote opt-in auth-gated; degrade a asset-free si unavailable).
4. **Step-gated.** Cada step tiene gate. Sin gate pasado, no avanzas. Steps
   user-gated (0, 6) pausan para approval. Step 2 source condicional (skip si
   `asset_needs` vacío, state `gate-passed` con nota skipped).
5. **Delega capabilities on-demand.** Carga solo lo que el step activo necesita.
   Capabilities nunca son owners del deliverable; el workflow sí.
6. **Render-path offline-first.** Compositions (frames) offline/deterministic.
   Step 2 source usa `content-os-media` (search remote opt-in, el único network
   path, dado search-driven). No network en render path (Steps 4-6). State
   mismo es offline (no https URLs en state — source_ref normalizado).
7. **Deterministic.** Mismo input + mismo design + mismo frames → mismo render.
   Sin `Date.now()`/`Math.random()`/`new Date()` en compositions (hereda core).
8. **Seek-safe.** GSAP `paused: true`, scrubbed a frame `t` (hereda
   `content-os-animation`). No `repeat: -1`, no relative `+=`, no CSS `transition:`
   en animated elements.
9. **No footage.** Motion-graphics no tiene live-action subject. `footage: true`
   = violación `footage-in-motion-graphics`. Assets (logos, images, screenshots)
   son assets, no footage.
10. **RENDERED_DRAFT != HUMAN_APPROVED.** `renders/video.mp4` (o overlay) es
    `RENDERED_DRAFT`. `finalize` gate passed sin render = `no-render` violación.
    `READY`/publicación requiere gates humanos G13-G17 (manuales por diseño).

## Steps (summary)

### Step 0: Setup

Brief confirmado por router. Clasificar intent (form vs search). Resolver
project dir (`videos/<subject>-motion/`, ej `q3-stat-motion`, nunca workspace
name o timestamp). Escribir `workflow-state.yml` (project, route,
capability_map, category draft, asset_needs[], vo_mode silent, offline true).
Gate: project init + state file + intent classified.

### Step 1: Plan (Director Part 1)

Decidir: ¿necesita search? (fork inicial). No → pick form category, content
user-supplied, `asset_needs: []`. Sí → emit search plan (news/web/tweet/image;
two-pole queries) en `asset_needs[]`; categoría confirmada por content type en
Step 2. Escribir draft `shot-plan.json` (envelope + categoría + asset_needs +
shot brief de un párrafo). Gate: `shot-plan.json` exists + category chosen +
asset_needs declared.

### Step 2: Source (conditional — skip si `asset_needs` vacío)

Si `asset_needs` non-empty, resolve via `content-os-media` (search/generate/fetch
→ frozen project-local paths + ledger en `assets/index.md`). Search remote
opt-in auth-gated; degrade a asset-free si unavailable (nota en context.log).
Si `asset_needs` empty (form categories), skip: state `gate-passed` con nota
skipped, no `assets/`. Gate: assets resolved (o skipped con nota).

### Step 3: Design (Director Part 2)

Designar el shot **alrededor de los assets disponibles**: pick catalog block(s)

- `content-os-animation` rules/blueprints, layout, motion, beats, (para
  asset-fusion) element_positions + eyedropper palette. Finalizar `shot-plan.json`
  (content.block + content.customize + per-category content). Gate: shot-plan
  final + block(s) chosen + motion declared.

### Step 4: Build (reuse-first)

Build `compositions/index.html` via `content-os-core` contract (seek-safe GSAP,
`window.__timelines`, `class="clip"` + stable ids, `tl.seek(0)`, deterministic).
Reuse-first: catalog blocks via `content-os-registry` + customize in place;
hand-author solo gaps + asset-fusion affordance. Gate: `index.html` built +
honors HF-equivalent contract.

### Step 5: Verify

`content-os-keyframes` lint (pose + seek-safe) + `content-os-core` check +
proof snapshots (opening state, signature move, final hold). Inspect contact
sheet. On failure, una repair pass in-place, rerun failed gate. Never change
fixed duration to hide a defect. Gate: lint + check + snapshots pass.

### Step 6: Finalize / Approve + Render

User review (user-gated). Preguntar: "preview first, or render?" Si preview,
abrir Studio, volver al mismo gate tras revisions. Render solo tras explicit
render answer: `renders/video.mp4` via `content-os-core` (o overlay
`.webm`/`.mov` con `--format`). Verificar output exists, non-empty, intended
duration. Gate: checks pass + user approval + MP4/overlay exists.

## Critical Constraints

- step-gated orchestrator (setup→plan→source→design→build→verify→finalize);
  asset-first (plan source before design); hash-bound via sha256 (registry + 4
  lifecycle events).
- No `Date.now()`/`Math.random()`/`new Date()`/`performance.now()` en
  compositions (hereda `content-os-core`).
- No `fetch`/`setTimeout`/`setInterval` en compositions (hereda core).
- No external assets / network / Google Fonts CDN en frames (render-path
  offline-first). Único network path: Step 2 source search (search-driven,
  remote opt-in).
- No `repeat: -1` / relative `+=` / CSS `transition:` en animated elements
  (hereda `content-os-animation` + `content-os-keyframes`).
- No narración (vo_mode silent, no SCRIPT, no TTS). Music bed opcional background.
- No footage (no live-action subject). Assets (logos/images/screenshots) ok.
- Sin gate pasado, no avanzas. Steps user-gated (0, 6) pausan.
- `renders/video.mp4` (o overlay) = `RENDERED_DRAFT`, no `HUMAN_APPROVED`.

## Stop rules

- Workflow auditable (`workflow-audit.mjs` PASS), todos gates pasados, MP4/overlay
  existe: STOP workflow.
- Step user-gated sin approval: STOP, pedir approval.
- Asset search unavailable y no asset-free fallback viable: STOP, marcar
  `coverage_gap` o degradar a asset-free (form category).
- Sin brief (router no despachó): STOP, rutcea via `content-os-router`.

## Done

Motion graphic `renders/video.mp4` (o transparent overlay) = `RENDERED_DRAFT`.
Workflow auditable, gates pasados, capabilities delegadas, render-path
offline-first + deterministic + seek-safe heredados. `READY`/publicación bloquea
gates humanos G13-G17 (manuales por diseño).
