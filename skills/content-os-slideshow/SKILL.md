---
name: content-os-slideshow
description: This skill should be used when the user asks to "author a slideshow", "build a presentation or pitch deck", "create an interactive deck with discrete slides", "add fragment reveals and branching to a deck", "convert an existing page into a deck", or "build a navigable HyperFrames-style slideshow deck (not a rendered MP4)".
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Orchestrates content-os-core (HTML composition contract + seek-safe GSAP per slide), content-os-animation (slide transitions), content-os-keyframes (pose/lint), content-os-creative (brand tokens, slide layout), content-os-registry (reusable slide blocks), content-os-router (dispatch). Input = deck intent (slides, flow, source page optional). Output = navigable deck (HTML), NOT MP4. Unnarrated (speaker notes presenter-only).
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Content OS Slideshow

Orquestador deck→navigable-slideshow: autor una presentación, pitch deck, o
deck interactivo con slides discretos, fragment reveals, branching, hotspot
navigation, y built-in presenter mode con speaker notes. También convierte una
página existente en deck. Adaptado de `slideshow` (vendor, referencia, Apache
2.0) al arquitectura local fail-closed + hash-bound + offline-first.

Diferencia con el vendor: no `npx hyperframes` CLI, no `hyperframes present`,
no `hyperframes lint/check` mágicos. Composition via `content-os-core` (HTML
contract, seek-safe GSAP per slide). Lint via `content-os-keyframes`. Slide
blocks via `content-os-registry`. Brand tokens via `content-os-creative`.

## Output — navigable deck, NOT MP4

El output es el **running deck**: un HTML composition con slides discretos (un
`data-composition-id` por slide) + un **JSON island**
(`<script type="application/hyperframes-slideshow+json">`) que declara slides,
fragments, hotspots y branch sequences. El deck se sirve/sirve navegável
(present mode, keyboard ← →, touch swipe).

**NO renderizar el deck a un solo MP4.** Un deck se autorea como varias scene
compositions top-level (un `data-composition-id` por slide) **sin master-root
composition** que las envuelva, así que render resuelve solo la **primera**
composition y emite un MP4 silenciosamente truncado. `rendered_mp4: true` =
violación `render-mp4`. El output soportado es el deck live + per-slide snapshot
stills.

Eres el **orchestrator**. Trabaja en `videos/<project>/`. Corre steps en orden,
pasa cada gate antes de continuar. Steps user-gated: Step 0, Step 5. Delega
design/layout a capabilities; no dupliques rules aquí.

step-gated orchestrator (setup→plan→design→build→verify→finalize); output is a
navigable deck not MP4 (no master-root composition); JSON island declares slides

- sequences; hash-bound via sha256 (registry + 4 lifecycle events). deterministic
  seek-safe (window.__timelines, paused: true, tl.seek for fragment navigation);
  offline-first (deck HTML offline/deterministic); slides are authored scenes with
  fragments + hotspots + branching.

## Preflight (siempre)

1. Confirmar route: `content-os-router` despachó con `route: content-os-slideshow`
   - `capability_map[]` en el `intent-brief.jsonl`. Sin brief, rutcea primero.
2. **Intent confirmation** — si el request llegó como "presentation", "pitch
   deck", "deck", "interactive deck", "convert this page", pausar y confirmar:
   "Do you want this as a Content OS slideshow?" (navigable deck, no MP4). Esta
   confirmación es routing decision, no preference gate — sobrevive autonomous
   mode. No autor hasta que el user diga yes.
3. Verificar `content-os-core` HTML composition contract (`data-*` timing,
   seekable GSAP, framework-owned media).
4. Verificar `content-os-creative` brand tokens (system fonts, no Google Fonts
   CDN; `var(--f-body)` resolved a concrete stack).
5. Correr `scripts/workflow-audit.mjs <project-state>` antes de avanzar gates.

## Default: deck intent → navigable deck

```bash
node <SKILL_DIR>/scripts/workflow-audit.mjs videos/<project>/workflow-state.yml --out <dir>
```

Workflow: Step 0 setup → Step 1 plan → Step 2 design → Step 3 build → Step 4
verify → Step 5 finalize/present. Cada step tiene gate. Output
`renders/deck.html` (o `index.html` runnable) = `RENDERED_DRAFT` (deck draft).

## The two pieces

### 1. Scenes — declared normal way

Cada slide es una scene: `data-composition-id`, `data-start`, `data-duration`,
`data-label`, `data-width`, `data-height`. Branch slides (reachable solo via
hotspot, excluded de main line) se declaran igual — solo aparecen en
`slideSequences` en el island, no en `slides[]`.

### 2. JSON island — one script block per composition

`<script type="application/hyperframes-slideshow+json">` con `slides[]` (main
line, in order) + `slideSequences[]` (off-line branch sequences). Single source
of truth: slide order, notes, fragments, hotspots, branches. Cerca del top del
`<body>`, antes de scene divs.

## Slide writing rules (hard constraints)

- **Headline es un complete-sentence claim, no label.** "SMBs spend 14
  hours/week on manual scheduling" no "Scheduling problem". `headline_label:
true` = violación `label-not-claim`.
- **One idea + one visual per slide.** Si tentado a añadir segundo bullet cluster
  o segundo chart, split el slide.
- **Lead with the punchline.** El punto más fuerte va primero — en el slide y en
  el deck order.
- **Bottom-up market sizing.** Nunca "$50B TAM" sin mostrar el math. Build from
  unit economics up.
- **Font minimum 30pt equivalent.** At 1920×1080, headline 72-96px; body 48px.
  Never below 40px for audience-readable text.

## Fragments — reveal hold-points

Un fragment es un absolute composition-timeline time (seconds) dentro del
slide's `[start, end]` donde el controller hold un reveal state. Player entra a
`fragments[0]` y hold; Next → seek `fragments[1]`; después del último fragment,
Next avanza al siguiente slide. Slide sin fragments entra a rest frame
(midpoint, no exactly `slide.end`). Fragment times dentro de `[start, end]`.
Navigation es seek-driven, no play-driven.

## Branching — hotspots + slide sequences

Branch slides son real scenes en el mismo composition timeline. Listadas solo
en `slideSequences`, excluded de main-line navigation. Click hotspot → push
`{sequenceId, slideIndex: 0}` al nav stack → entra branch's first slide. `back()`
pops stack → returns al parent slide. `backToMain()` clears stack → root slide.
Breadcrumb desde stack. No añadir branch scene IDs al main `slides[]` (lint flags
overlap).

## Routing (delegate to capabilities)

| Need                                                                   | Capability             |
| ---------------------------------------------------------------------- | ---------------------- |
| Composition contract, HTML per-slide scenes                            | `content-os-core`      |
| Slide transitions, fragment motion                                     | `content-os-animation` |
| Pose contract, lint (sceneId resolves, fragments in range, no overlap) | `content-os-keyframes` |
| Brand tokens, slide layout, font stacks                                | `content-os-creative`  |
| Reusable slide blocks (headline, chart, quote)                         | `content-os-registry`  |

## Workflow Contract (ground truth)

1. **Orchestrator, no rules.** Este workflow orquesta steps + gates. Design y
   layout rules viven en capabilities. No dupliques.
2. **Navigable deck, no MP4.** Output es el deck HTML (slides discretos + JSON
   island). `rendered_mp4: true` = violación `render-mp4` (render truncaría al
   primer slide). Sin master-root composition.
3. **Unnarrated.** Deck no tiene narración. `vo_mode: silent`, `has_script:
false`. Speaker notes son presenter-only text (editable en presenter view,
   stored en localStorage), no TTS.
4. **Step-gated.** Cada step tiene gate. Sin gate pasado, no avanzas. Steps
   user-gated (0, 5) pausan para approval.
5. **Delega capabilities on-demand.** Carga solo lo que el step activo necesita.
6. **Render-path offline-first.** Deck HTML offline/deterministic. No network
   en compositions. Assets (images) via `content-os-registry` (offline cascade).
7. **Deterministic.** Mismo deck intent + mismo design + mismo scenes → mismo
   deck. Sin `Date.now()`/`Math.random()`/`new Date()` en compositions.
8. **Seek-safe.** GSAP `paused: true`, scrubbed via seek (fragment navigation es
   seek-driven). No `repeat: -1`, no relative `+=`, no CSS `transition:` en
   animated elements.
9. **Slide writing rules.** Headline = complete-sentence claim (no label).
   `headline_label: true` = violación `label-not-claim`. One idea + one visual.
   Lead with punchline. Font ≥30pt.
10. **RENDERED_DRAFT != HUMAN_APPROVED.** `renders/deck.html` es `RENDERED_DRAFT`.
    `finalize` gate passed sin deck presentable = `no-deck` violación.
    `READY`/publicación requiere gates humanos G13-G17 (manuales por diseño).

## Steps (summary)

### Step 0: Setup

Brief confirmado por router. Intent confirmation (slideshow vs video — routing
decision, sobrevive autonomous mode). Resolver project dir (`videos/<subject>-deck/`).
Escribir `workflow-state.yml` (project, route, capability_map, vo_mode silent,
has_script false, footage false, offline true, output_format deck). Gate:
intent confirmed + state file.

### Step 1: Plan (deck outline)

Deck outline: slides (main line, in order), flow, fragments per slide,
branches (hotspots + slide sequences), speaker notes draft. Bottom-up market
sizing si aplica. Lead with punchline (deck order). Gate: deck outline authored
(slide list + flow + fragments/branches declared).

### Step 2: Design (slide content + layout)

Designar cada slide: headline (complete-sentence claim), one idea + one visual,
layout (brand tokens via `content-os-creative`), font stacks (system fonts,
concrete render-safe, no `var(...)` unresolved), block reuse via
`content-os-registry`. Para source-page conversion: preserve visual design,
motion, interactions, media behavior (ver `references/porting.md`). Gate: slide
content authored + headlines are claims + blocks chosen.

### Step 3: Build (HTML composition + JSON island)

Build `compositions/deck.html` via `content-os-core` contract. Scenes (un
`data-composition-id` por slide, sin master-root). JSON island
(`<script type="application/hyperframes-slideshow+json">`) con `slides[]` +
`slideSequences[]`. Seek-safe GSAP per slide (`window.__timelines[id]`,
`paused: true`, fragment entrances at absolute times). Reuse-first: catalog
slide blocks via `content-os-registry`. Stacked scene frames: `opacity:0;
visibility:hidden; pointer-events:none` en hidden; `is-active` en active.
Gate: `deck.html` built + island valid + honors contract.

### Step 4: Verify (lint + preview)

`content-os-keyframes` lint (pose + seek-safe) + `content-os-core` check.
Slideshow lint: every `slide.sceneId` resolves a scene, every `hotspot.target`
references a `slideSequence` id, fragment times within `[start, end]`, no two
main-line slides overlap in time. Preview deck (navigate slides, fragments,
branches). Slide writing rules check (headline = claim, font ≥30pt). Una
repair pass in-place, rerun failed gate. Gate: lint + check + preview pass.

### Step 5: Finalize / Approve + Present

User review (user-gated). Preguntar: "preview first, or finalize deck?" Si
preview, abrir deck, volver al mismo gate tras revisions. Finalize solo tras
explicit answer: deck presentable (`renders/deck.html` runnable, navigation
responsive, presenter mode available). Validar direct-open path (`file://` o
local server; no broken iframe media). Gate: checks pass + user approval +
deck presentable.

## Critical Constraints

- step-gated orchestrator (setup→plan→design→build→verify→finalize); output is
  a navigable deck not MP4 (no master-root composition); JSON island declares
  slides + sequences; hash-bound via sha256 (registry + 4 lifecycle events).
- No `Date.now()`/`Math.random()`/`new Date()`/`performance.now()` en
  compositions (hereda `content-os-core`).
- No `fetch`/`setTimeout`/`setInterval` en compositions (hereda core).
- No external assets / network / Google Fonts CDN en deck (render-path
  offline-first). System fonts, concrete render-safe stacks.
- No `repeat: -1` / relative `+=` / CSS `transition:` en animated elements
  (hereda `content-os-animation` + `content-os-keyframes`).
- No MP4 render (`render-mp4` — deck has no master-root, render truncates).
- No label headline (`label-not-claim` — headline is complete-sentence claim).
- Stacked scene frames: both visual hiding + event gating (`opacity` +
  `visibility` + `pointer-events`).
- Sin gate pasado, no avanzas. Steps user-gated (0, 5) pausan.
- `renders/deck.html` = `RENDERED_DRAFT`, no `HUMAN_APPROVED`.

## Stop rules

- Workflow auditable (`workflow-audit.mjs` PASS), todos gates pasados, deck
  presentable: STOP workflow.
- Step user-gated sin approval: STOP, pedir approval.
- Intent no confirmado (user no quiere slideshow): STOP, re-route via
  `content-os-router`.
- Sin brief (router no despachó): STOP, rutcea via `content-os-router`.

## Done

Navigable `renders/deck.html` (slides discretos + JSON island, present mode) =
`RENDERED_DRAFT`. Workflow auditable, gates pasados, capabilities delegadas,
render-path offline-first + deterministic + seek-safe heredados.
`READY`/publicación bloquea gates humanos G13-G17 (manuales por diseño).
