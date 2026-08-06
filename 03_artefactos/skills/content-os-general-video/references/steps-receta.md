# Steps receta — content-os-general-video

Receta detallada de los 8 steps del orquestador freeform. SKILL.md mantiene el router (step
+ gate + puntero); este reference contiene el "cómo" completo. Gobernado por checker
(required) + package_manifest_sha256.

## Step 0: Setup

Brief confirmado por router (freeform). Resolver project dir (`videos/<subject>-video/`).
Escribir `workflow-state.yml` (project, route, capability_map, vo_mode, has_script, footage,
offline true, flow, storyboard, scope_expanded false, rendered_before_approval false).
Gate: intent confirmed + state file.

## Step 1: Plan (viewer arc + structure + design spec)

State viewer arc, structure, rhythm, duration driver. Para narrated arcs, read
`content-os-creative` story-spine; rhythm, beat-direction; structure, composition-patterns.
Para multi-scene, one `## Frame N` block per scene en `STORYBOARD.md` — `status: outline`,
declared `src:`, blueprint/rules citation (motion names from `content-os-animation` indexes,
never invented), beat text — **even when `storyboard: no`** (block = dispatch unit; board =
review surface only). Design spec (4 items si no existe). Ceiling treatment si
`flow: companion`. Gate: plan authored + design spec resolved + scene blocks declared.

## Step 2: Resolve (dependencies + media + blocks)

Install registry blocks (`content-os-registry`) before parallel work. Stage user assets,
adopt existing media, resolve solo lo que el brief requiere (via `content-os-media`). Start
audio early cuando sus timings drive duration. Gate: dependencies resolved + media adopted +
blocks installed.

## Step 3: Build (scenes + motion)

Para short single-scene: implement scene at most visible moment antes de añadir motion
(confirmed wireframe = end state, no redraw), then animate from cited blueprint/rules — read
full recipe body (`content-os-animation` blueprints/rules) antes de escribir motion. Para
multi-scene: build inline si ≤6 short scenes; fan out via sub-agent dispatch si más (2-3
scenes per worker, una sola wave). Cada scene: `window.__timelines[id]`, `paused: true`,
seek-safe. Gate: all scenes built + motion authored + honors contract.

## Step 4: Assemble (mount + transitions + audio)

Mount scenes, media, transitions, captions, audio via production loop (`content-os-core`).
Real voice duration overrides estimates. Merge motion sidecars (durations + exit/entry
vectors into assembly). Gate: assembled + audio synced + transitions seamless.

## Step 5: Verify (lint + check + snapshots)

`content-os-keyframes` lint (pose + seek-safe) + `content-os-core` check. Para
sub-compositions: inspect midpoint snapshots. Para multi-scene: review animation map.
Contrast findings resolved. Una repair pass in-place, rerun failed gate. Gate: lint + check
+ snapshots + contrast pass.

## Step 6: Final approval (user-gated)

User review. Preguntar: "preview first, or render?" Si preview, abrir Studio preview,
volver al mismo gate tras revisions. Render solo tras explicit answer
(`rendered_before_approval: true` si render sin approval = `unapproved-render` violación).
Gate: checks pass + user approval.

## Step 7: Finalize (render + handoff)

Render `renders/final.mp4` (FFmpeg composite, offline). Verify rendered file. Report actual
duration. Handoff: final preview o rendered artifact, contact o snapshot sheet (scene
midpoints para multi-scene). Gate: render exists + verified + handoff complete.