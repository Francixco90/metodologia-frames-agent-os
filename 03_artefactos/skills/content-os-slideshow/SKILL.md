---
name: content-os-slideshow
description: This skill should be used when the user asks to "author a slideshow", "build a presentation or pitch deck", "create an interactive deck with discrete slides", "add fragment reveals and branching to a deck", "convert an existing page into a deck", or "build a navigable HyperFrames-style slideshow deck (not a rendered MP4)".
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
compatibility: Orchestrates content-os-core (HTML composition contract + seek-safe GSAP per slide), content-os-animation (slide transitions), content-os-keyframes (pose/lint), content-os-creative (brand tokens, slide layout), content-os-registry (reusable slide blocks), content-os-router (dispatch). Input = deck intent (slides, flow, source page optional). Output = navigable deck (HTML), NOT MP4. Unnarrated (speaker notes presenter-only).
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Frames ContentOS Slideshow

Orquestador deck→navigable-slideshow: autor una presentación, pitch deck, o
deck interactivo con slides discretos, fragment reveals, branching, hotspot
navigation, y built-in presenter mode con speaker notes. También convierte una
página existente en deck. Adaptado de `slideshow` (vendor, Apache 2.0) a
fail-closed + hash-bound + offline-first. No `npx hyperframes` CLI; composition
via `content-os-core`, lint via `content-os-keyframes`, blocks via
`content-os-registry`, brand via `content-os-creative`.

## Output — navigable deck, NOT MP4

El output es el **running deck**: HTML composition con slides discretos (un
`data-composition-id` por slide) + un **JSON island**
(`<script type="application/hyperframes-slideshow+json">`) que declara slides,
fragments, hotspots y branch sequences. Navegável (present mode, keyboard ← →,
touch swipe).

**NO renderizar el deck a MP4.** Un deck se autorea como varias scene
compositions top-level **sin master-root** que las envuelva — render resuelve
solo la **primera** composition y emite un MP4 silenciosamente truncado.
`rendered_mp4: true` = violación `render-mp4`. Output soportado: deck live +
per-slide snapshot stills.

Eres el **orchestrator**. Trabaja en `videos/<project>/`. step-gated
(setup→plan→design→build→verify→finalize); steps user-gated: 0, 5. JSON island
declares slides + sequences; hash-bound via sha256; deterministic seek-safe
(window.__timelines, paused: true, tl.seek for fragment navigation);
offline-first; slides are authored scenes with fragments + hotspots + branching.

## Preflight (siempre)

1. Confirmar route: `content-os-router` despachó con `route: content-os-slideshow`
   + `capability_map[]` en el `intent-brief.jsonl`. Sin brief, rutcea.
2. **Intent confirmation** — si el request llegó como "presentation", "pitch
   deck", "deck", "interactive deck", "convert this page", pausar y confirmar:
   "Do you want this as a Frames ContentOS slideshow?" (navigable deck, no MP4).
   Routing decision, no preference gate — sobrevive autonomous mode. No autor
   hasta que el user diga yes.
3. Verificar `content-os-core` HTML composition contract (`data-*` timing,
   seekable GSAP, framework-owned media).
4. Verificar `content-os-creative` brand tokens (system fonts, no Google Fonts
   CDN; `var(--f-body)` resolved a concrete stack).
5. Correr `scripts/workflow-audit.mjs <project-state>` antes de avanzar.

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

- **Headline = complete-sentence claim, no label.** "SMBs spend 14 hours/week
  on manual scheduling" no "Scheduling problem". `headline_label: true` =
  `label-not-claim`.
- **One idea + one visual per slide.** Tentado a añadir segundo bullet cluster o
  chart → split el slide.
- **Lead with the punchline.** El punto más fuerte va primero — slide y deck order.
- **Bottom-up market sizing.** Nunca "$50B TAM" sin mostrar el math.
- **Font ≥30pt equivalent.** At 1920×1080, headline 72-96px; body 48px. Never
  below 40px for audience-readable text.

## Fragments — reveal hold-points

Un fragment es un absolute composition-timeline time (seconds) dentro del
slide's `[start, end]` donde el controller hold un reveal state. Player entra a
`fragments[0]` y hold; Next → seek `fragments[1]`; después del último fragment,
Next avanza al siguiente slide. Slide sin fragments entra a rest frame
(midpoint, no `slide.end`). Navigation es seek-driven, no play-driven.

## Branching — hotspots + slide sequences

Branch slides son real scenes en el mismo composition timeline. Listadas solo
en `slideSequences`, excluded de main-line. Click hotspot → push
`{sequenceId, slideIndex: 0}` al nav stack → branch's first slide. `back()`
pops stack → parent slide. `backToMain()` clears stack → root slide. No añadir
branch scene IDs al main `slides[]` (lint flags overlap).

## Routing (delegate to capabilities)

| Need                                                        | Capability             |
| ----------------------------------------------------------- | ---------------------- |
| Composition contract, HTML per-slide scenes                 | `content-os-core`      |
| Slide transitions, fragment motion                          | `content-os-animation` |
| Pose contract, lint (sceneId, fragments in range, no overlap) | `content-os-keyframes` |
| Brand tokens, slide layout, font stacks                     | `content-os-creative`  |
| Reusable slide blocks (headline, chart, quote)              | `content-os-registry`  |

## Workflow Contract (ground truth)

1. **Orchestrator, no rules.** Orquesta steps + gates. Design/layout rules en
   capabilities. No dupliques.
2. **Navigable deck, no MP4.** Output = deck HTML (slides discretos + JSON
   island). `rendered_mp4: true` = `render-mp4` (render trunca al primer slide).
   Sin master-root composition.
3. **Unnarrated.** `vo_mode: silent`, `has_script: false`. Speaker notes =
   presenter-only text (localStorage), no TTS.
4. **Step-gated.** Cada step tiene gate. Steps user-gated (0, 5) pausan.
5. **Delega on-demand.** Carga solo lo que el step activo necesita.
6. **Offline-first.** Deck HTML offline/deterministic. No network en
   compositions. Assets via `content-os-registry` (offline cascade).
7. **Deterministic.** Mismo deck intent + design + scenes → mismo deck. Sin
   `Date.now()`/`Math.random()`/`new Date()` en compositions.
8. **Seek-safe.** GSAP `paused: true`, scrubbed via seek (fragment navigation es
   seek-driven). No `repeat: -1`/`+=`/CSS `transition:` en animated elements.
9. **Slide writing rules.** Headline = complete-sentence claim (no label).
   `headline_label: true` = `label-not-claim`. One idea + one visual. Lead with
   punchline. Font ≥30pt.
10. **RENDERED_DRAFT != HUMAN_APPROVED.** `renders/deck.html` = `RENDERED_DRAFT`.
    `finalize` sin deck presentable = `no-deck`. `READY`/publicación requiere
    gates G13-G17.

## Steps (router — detail en `references/steps-receta.md`)

| Step | Acción | Gate |
| --- | --- | --- |
| 0 Setup | Router brief. Intent confirmation (slideshow vs video). `workflow-state.yml` (vo_mode silent, output_format deck). | intent + state file |
| 1 Plan | Deck outline: slides (main line), flow, fragments/slide, branches (hotspots + slide sequences), speaker notes. Bottom-up sizing si aplica. | outline authored |
| 2 Design | Headline (claim), one idea + one visual, layout (brand tokens), font stacks (system, render-safe), block reuse. Source-page: ver `references/porting.md`. | content + headlines + blocks |
| 3 Build | `compositions/deck.html` (scenes sin master-root) + JSON island (`slides[]` + `slideSequences[]`). Seek-safe GSAP per slide. Reuse-first blocks. Stacked frames hidden. | deck built + island valid |
| 4 Verify | `content-os-keyframes` lint + `content-os-core` check + slideshow lint (sceneId/hotspot/fragment/overlap). Preview. Slide writing rules check. Repair. | lint + check + preview |
| 5 Finalize | User-gated. "preview or finalize?" Deck presentable (`renders/deck.html` runnable, navigation responsive, presenter mode). Direct-open path valid. | checks + approval + presentable |

## Stop rules

- `workflow-audit.mjs` PASS + gates pasados + deck presentable: STOP.
- Step user-gated sin approval: STOP, pedir approval.
- Intent no confirmado (user no quiere slideshow): STOP, re-route via
  `content-os-router`.
- Sin brief (router no despachó): STOP, rutcea.

## Done

Navigable `renders/deck.html` (slides discretos + JSON island) =
`RENDERED_DRAFT`. Workflow auditable, gates pasados, capabilities delegadas,
offline-first + deterministic + seek-safe heredados. `READY`/publicación bloquea
gates G13-G17.