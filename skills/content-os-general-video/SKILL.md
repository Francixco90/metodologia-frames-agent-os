---
name: content-os-general-video
description: This skill should be used when the user asks to "author a custom video", "build a brand reel or sizzle reel", "make a montage", "build a multi-scene video when no specialized workflow fits", "remix existing footage", "build a static title card or loop", or "co-create a freeform video (companion flow)".
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Orchestrates content-os-core (HTML composition contract + seek-safe GSAP), content-os-animation (blueprints/rules/transitions), content-os-keyframes (pose/lint/snapshot), content-os-creative (brand/house-style/story-spine/genre lenses), content-os-media (media OS dual offline + remote-opt-in), content-os-registry (reusable blocks), content-os-router (dispatch). Input = freeform brief (no specialized workflow fits). Output = MP4 (RENDERED_DRAFT). Companion or automation flow.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Content OS General Video

Orquestador freeform: autor un video custom cuando ningún workflow especializado
encaja — brand reels, sizzle reels, montajes, multi-scene pieces, static loops,
title cards, footage remixes, freeform builds. Adaptado de `general-video`
(vendor, referencia, Apache 2.0) al arquitectura local fail-closed + hash-bound

- offline-first.

Diferencia con el vendor: no `npx hyperframes` CLI, no `hyperframes init`,
no `hyperframes lint/check` mágicos, no `frame-packets` dispatch mágico.
Composition via `content-os-core` (HTML contract, seek-safe GSAP). Lint via
`content-os-keyframes`. Blueprints/rules via `content-os-animation`. Brand +
genre lenses via `content-os-creative`. Media via `content-os-media` (offline
default; remote opt-in auth-gated). Blocks via `content-os-registry`.

## When to use this vs a specialized workflow

Usa `content-os-general-video` cuando el brief no encaje en ningún workflow
especializado:

| Si el brief pide...                                                                   | Usa workflow especializado        |
| ------------------------------------------------------------------------------------- | --------------------------------- |
| Texto → faceless explainer video                                                      | `content-os-faceless-explainer`   |
| GitHub PR → code-change explainer                                                     | `content-os-pr-to-video`          |
| Producto/website → launch video (site tour)                                           | `content-os-product-launch-video` |
| Short unnarrated motion-first unit (animated title, stat, charts)                     | `content-os-motion-graphics`      |
| Talking-head footage + captions (rail/embed)                                          | `content-os-embedded-captions`    |
| Navigable deck (no MP4)                                                               | `content-os-slideshow`            |
| Todo lo demás (multi-scene, brand reel, montage, title card, footage remix, freeform) | **`content-os-general-video`**    |

Si duda, `content-os-router` despacha. Si el router despachó
`content-os-general-video`, el brief es libre (freeform).

## Flow — companion vs automation

| `flow`       | Quién conduce               | Comportamiento                                                                |
| ------------ | --------------------------- | ----------------------------------------------------------------------------- |
| `automation` | El workflow elige + ejecuta | Choose route, state it in one line, build, verify, hand off.                  |
| `companion`  | Co-creas con el user        | Arrive as director, not contractor. Ceiling treatment first; user trims down. |

Companion = involvement + quality. La honesta response es la mejor version que
puedes diseñar, no la más pequeña que puedes defender. El primer plan es el
ceiling treatment: story arc (genre lens), design spec, each scene's motion
treatment citado por nombre, transitions, audio identity (music/sound marks o
deliberate silence), el material del user colocado, open + close diseñados. El
user recorta; nunca arma approval por approval.

**El ceiling pertenece al concepto, no al toolbox.** Cada layer sirve el
mensaje del brief — un treatment que viste cualquier video igual es decoración.
Craft sube al ceiling; content nunca crece más allá de lo pedido (scope exacto).

## Storyboard — review surface

| `storyboard` | Behavior                                                   |
| ------------ | ---------------------------------------------------------- |
| `yes`        | Plan + sketch son review surface. Run review loop on plan. |
| `no`         | Build sin board. Plan pausa solo si el user la pide.       |

Nunca inventes sinónimos para estos estados. Un "just build it" ongoing signal
llega como `flow: automation`, `storyboard: no` (lo resuelve el router).

Eres el **orchestrator**. Trabaja en `videos/<project>/`. Corre steps en orden,
pasa cada gate antes de continuar. Steps user-gated: Step 0, Step 6 (final
approval). Delega design/motion/media a capabilities; no dupliques rules aquí.

step-gated orchestrator (setup→plan→resolve→build→assemble→verify→finalize);
freeform when no specialized workflow fits; hash-bound via sha256 (registry + 4
lifecycle events). deterministic seek-safe (window.__timelines, paused: true,
tl.seek(frame/fps)); offline-first render path (compositions + frames + composite
all offline); media via content-os-media (offline default + remote opt-in
auth-gated); scope exact (build what was asked, no scope creep).

## Preflight (siempre)

1. Confirmar route: `content-os-router` despachó con `route: content-os-general-video`
   - `capability_map[]` en el `intent-brief.jsonl`. Sin brief, rutcea primero.
2. **Cross-cutting adapters**:
   - **Media**: para audio, image, voice, grade, LUT, caption, o media-operation,
     load `content-os-media` (resolve/adopt/reuse). Vague footage feedback +
     named styles via `content-os-media` treatments ref antes de editar. Antes
     del primer provider autenticado, relay auth status; si signed out, gate
     (collaborative waits / autonomous states + continues offline). Local-only
     adoption no requiere auth gate.
   - **Figma**: si input es `figma.com` URL, build from exported assets/tokens
     (no raw Figma connector calls — skip SVG sanitization + provenance + token
     binding).
3. Verificar `content-os-core` HTML composition contract.
4. Verificar `content-os-creative` brand tokens (system fonts, no Google Fonts
   CDN; `var(--f-body)` resolved).
5. Correr `scripts/workflow-audit.mjs <project-state>` antes de avanzar gates.

## Sub-agent dispatch (scale-dependent)

**Dispatch pays for itself only at scale.** Authoring packets + warming fresh
worker contexts cuesta minutos + tokens reales: un film de hasta ~6 short
scenes builds FASTER inline, en este context, una scene tras otra (medido: 5
short scenes ≈ 9 min inline vs ≈ 21 min packetized). Fan out solo cuando el plan
excede eso — más scenes, o individualmente pesadas — y entonces da cada worker
**2-3 scenes**, no una, y spawn **all workers in una sola wave** (una segunda
wave nearly dobla el window).

Con channel de delegación: dispatch. Sin channel: fallback serially, un packet
a la vez, trabajando del packet solo. Workers leen solo sus packets + design
truth file; nunca abren el storyboard completo ni skill docs.

## Genre lenses (companion)

Para `flow: companion`, antes del primer plan, lee `content-os-creative`
story-spine + house-style + el nearest genre lens + el full capability-menu. El
ceiling treatment se diseña desde estos, no se recalls. Borrowed workflows:
cuando el piece se parece a un shipped workflow, borrow its genre references as
examples — story shape + taste, no scripts privados ni pipeline state.

## Workflow Contract (ground truth)

1. **Orchestrator, no rules.** Este workflow orquesta steps + gates. Design y
   motion rules viven en capabilities. No dupliques.
2. **Scope exact.** Build lo que el user pidió. Un title card no es title card +
   tres scenes, music, captions. Offer additions antes de añadir. `scope_expanded:
true` = `scope-creep` violación.
3. **Render-path offline-first.** Compositions (HTML+GSAP) + frames (Playwright
   HTML→frames) + composite (FFmpeg) — all offline. Media resolution: offline
   default, remote opt-in auth-gated (único network path). No network en render
   path (Steps 4-6).
4. **Deterministic.** Mismo brief + mismo plan + mismo frames → mismo render. Sin
   `Date.now()`/`Math.random()`/`new Date()` en compositions.
5. **Seek-safe.** GSAP `paused: true`, scrubbed to frame `t` (hereda
   `content-os-animation`). No `repeat: -1`, no relative `+=`, no CSS
   `transition:` en animated elements.
6. **Design before HTML.** Resolve design source en orden: `frame.md` →
   `design.md` → `DESIGN.md`. First found = brand truth. Sin design spec,
   completa los 4 items (ground identity, concept angle sentence, font pairing,
   focal/edge/supporting/background) antes de escribir composition HTML.
7. **Render only after approval.** `rendered_before_approval: true` =
   `unapproved-render` violación. Open final Studio preview solo tras checks
   pass. Render solo tras approval (Step 6 user-gated).
8. **Step-gated.** Cada step tiene gate. Sin gate pasado, no avanzas. Steps
   user-gated (0, 6) pausan para approval.
9. **Delegate capabilities on-demand.** Carga solo lo que el step activo necesita.
10. **RENDERED_DRAFT != HUMAN_APPROVED.** `renders/final.mp4` es `RENDERED_DRAFT`.
    `finalize` gate passed sin render = `no-render` violación. `READY`/publicación
    requiere gates humanos G13-G17 (manuales por diseño).

## Steps (summary)

### Step 0: Setup

Brief confirmado por router (freeform). Resolver project dir
(`videos/<subject>-video/`). Escribir `workflow-state.yml` (project, route,
capability_map, vo_mode, has_script, footage, offline true, flow, storyboard,
scope_expanded false, rendered_before_approval false). Gate: intent confirmed +
state file.

### Step 1: Plan (viewer arc + structure + design spec)

State viewer arc, structure, rhythm, duration driver. Para narrated arcs, read
`content-os-creative` story-spine; rhythm, beat-direction; structure,
composition-patterns. Para multi-scene, one `## Frame N` block per scene en
`STORYBOARD.md` — `status: outline`, declared `src:`, blueprint/rules citation
(motion names from `content-os-animation` indexes, never invented), beat text —
**even when `storyboard: no`** (block = dispatch unit; board = review surface
only). Design spec (4 items si no existe). Ceiling treatment si `flow: companion`.
Gate: plan authored + design spec resolved + scene blocks declared.

### Step 2: Resolve (dependencies + media + blocks)

Install registry blocks (`content-os-registry`) before parallel work. Stage
user assets, adopt existing media, resolve solo lo que el brief requiere (via
`content-os-media`). Start audio early cuando sus timings drive duration. Gate:
dependencies resolved + media adopted + blocks installed.

### Step 3: Build (scenes + motion)

Para short single-scene: implement scene at most visible moment antes de añadir
motion (confirmed wireframe = end state, no redraw), then animate from cited
blueprint/rules — read full recipe body (`content-os-animation` blueprints/
rules) antes de escribir motion. Para multi-scene: build inline si ≤6 short
scenes; fan out via sub-agent dispatch si más (2-3 scenes per worker, una sola
wave). Cada scene: `window.__timelines[id]`, `paused: true`, seek-safe. Gate:
all scenes built + motion authored + honors contract.

### Step 4: Assemble (mount + transitions + audio)

Mount scenes, media, transitions, captions, audio via production loop
(`content-os-core`). Real voice duration overrides estimates. Merge motion
sidecars (durations + exit/entry vectors into assembly). Gate: assembled + audio
synced + transitions seamless.

### Step 5: Verify (lint + check + snapshots)

`content-os-keyframes` lint (pose + seek-safe) + `content-os-core` check. Para
sub-compositions: inspect midpoint snapshots. Para multi-scene: review animation
map. Contrast findings resolved. Una repair pass in-place, rerun failed gate.
Gate: lint + check + snapshots + contrast pass.

### Step 6: Final approval (user-gated)

User review. Preguntar: "preview first, or render?" Si preview, abrir Studio
preview, volver al mismo gate tras revisions. Render solo tras explicit answer
(`rendered_before_approval: true` si render sin approval = `unapproved-render`
violación). Gate: checks pass + user approval.

### Step 7: Finalize (render + handoff)

Render `renders/final.mp4` (FFmpeg composite, offline). Verify rendered file.
Report actual duration. Handoff: final preview o rendered artifact, contact o
snapshot sheet (scene midpoints para multi-scene). Gate: render exists +
verified + handoff complete.

## Critical Constraints

- step-gated orchestrator (setup→plan→resolve→build→assemble→verify→finalize);
  freeform when no specialized workflow fits; hash-bound via sha256 (registry + 4
  lifecycle events).
- No `Date.now()`/`Math.random()`/`new Date()`/`performance.now()` en
  compositions (hereda `content-os-core`).
- No `fetch`/`setTimeout`/`setInterval` en compositions (hereda core).
- No external assets / network / Google Fonts CDN en compositions (render-path
  offline-first). Media resolution offline default; remote opt-in auth-gated.
- No `repeat: -1` / relative `+=` / CSS `transition:` en animated elements
  (hereda `content-os-animation` + `content-os-keyframes`).
- No scope creep (`scope-creep` — build what was asked, offer additions before
  adding).
- No render before approval (`unapproved-render` — render only after Step 6
  user approval).
- Sin gate pasado, no avanzas. Steps user-gated (0, 6) pausan.
- `renders/final.mp4` = `RENDERED_DRAFT`, no `HUMAN_APPROVED`.

## Stop rules

- Workflow auditable (`workflow-audit.mjs` PASS), todos gates pasados, final.mp4
  exists + verified: STOP workflow.
- Step user-gated sin approval: STOP, pedir approval.
- Intent no confirmado (router no despachó general-video): STOP, re-route via
  `content-os-router`.
- Sin brief: STOP, rutcea via `content-os-router`.
- Brief encaja en workflow especializado: STOP, hand off al workflow correcto.

## Done

`renders/final.mp4` (RENDERED_DRAFT) + verified + handoff (final preview /
rendered artifact + duration + snapshot sheet). Workflow auditable, gates
pasados, capabilities delegadas, render-path offline-first + deterministic +
seek-safe heredados. Para `flow: companion`: treatment delivered, no just scope
— every scene's cited blueprint/rules realized, audio identity present (o
silence chosen + said), open + close designed. `READY`/publicación bloquea gates
humanos G13-G17 (manuales por diseño).
