# Slideshow — Steps receta (Step 0–5 detail)

Offloaded from `SKILL.md` (gateway router). Gobernado por `scripts/check-skill.mjs`
required list + `package_manifest_sha256`. No content cut — relocated.

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