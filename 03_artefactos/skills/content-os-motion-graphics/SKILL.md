---
name: content-os-motion-graphics
description: This skill should be used when the user asks to "make a short motion graphic", "create a kinetic typography or text animation", "animate a stat count-up", "build a logo sting or brand lockup", "make a lower-third or social overlay", "animate a chart or data-viz hit", "make an animated map", "animate a tweet or news headline", or "create a short design-led unnarrated motion graphic (under 30s, no voice-over)".
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
compatibility: Orchestrates content-os-core (HTML→MP4/overlay adapter), content-os-animation (motion vocabulary), content-os-keyframes (pose/lint), content-os-creative (brand tokens/preset), content-os-media (asset resolve, optional music bed), content-os-registry (catalog blocks). Input = short design request (line, stat, logo, data, URL). Unnarrated. Output RENDERED_DRAFT (MP4 or transparent overlay).
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Frames ContentOS Motion Graphics

Orquestador source→video: short, design-led, **unnarrated** motion graphic donde
el motion es el mensaje — kinetic typography, stat count-up, chart/data-viz hit,
logo sting / brand lockup, lower-third / callout / social overlay, animated map,
animated tweet / news headline, webpage/UI animation, o asset-fusion. Usualmente
<10s (hasta ~30s), sin narración ni live-action. Adaptado de `motion-graphics`
(vendor, Apache 2.0) al arquitectura local fail-closed + hash-bound +
render-path offline-first. No `npx hyperframes` CLI; render via `content-os-core`
(Playwright + FFmpeg).

Autónomo por diseño — a lo sumo una pregunta clarificadora
(`references/director.md`), luego build through verification sin review
intermedio. Render sigue user-gated (Step 6). **asset-first**: decide la
estrategia de assets y sourcea real material _antes_ de diseñar el shot, luego
diseña el shot alrededor de lo que tienes, luego compose reusando catalog
capabilities.

Eres el **orchestrator**. Trabaja en `videos/<project>/`. Corre steps en orden,
pasa cada gate. Steps user-gated: 0, 6. Delega design/motion a capabilities; no
dupliques rules aquí.

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
finalize/render. Cada step tiene gate. Compositions seek-safe GSAP
(`window.__timelines`, `paused: true`), registry `sha256` hash-bound. Output
`renders/video.mp4` (o overlay `.webm`/`.mov`) = `RENDERED_DRAFT`.

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
3. **asset-first.** Decide asset strategy + source real material _antes_ de
   diseñar el shot (Step 1 plan → Step 2 source). Form categories: `asset_needs:
   []`, skip Step 2. Search-driven: resolve via `content-os-media` (search
   remote opt-in auth-gated; degrade a asset-free si unavailable).
4. **step-gated.** Cada step tiene gate. Sin gate pasado, no avanzas. Steps
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

## Steps — router

Step 0–6 detail lives en `references/steps-receta.md` (governed, hash-bound).
Load la receta antes de ejecutar un step.

| Step | Gate                                                                  |
| ---- | --------------------------------------------------------------------- |
| 0    | project init + state file + intent classified                         |
| 1    | `shot-plan.json` exists + category chosen + asset_needs declared       |
| 2    | assets resolved (o skipped con nota) — condicional                     |
| 3    | shot-plan final + block(s) chosen + motion declared                    |
| 4    | `index.html` built + honors HF-equivalent contract                     |
| 5    | lint + check + snapshots pass                                          |
| 6    | checks pass + user approval + MP4/overlay exists (user-gated)          |

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