---
name: content-os-figma
description: This skill should be used when the user asks to "import a Figma design into a video", "bring a Figma frame into a composition", "pull brand tokens from Figma", "reconstruct a Figma component as HTML", "turn a Figma storyboard into animation", or "use my Figma logo in a video". Imports Figma content into a Frames ContentOS composition — rendered assets, brand tokens, and components reconstructed as editable HTML at exact geometry, plus storyboard sections decoded into element timelines (frames read as keyframes, not slides). Every import lands as a local frozen file with recorded provenance so renders stay deterministic; no Figma URL survives into the composition. Not a from-scratch creation workflow (use content-os-product-launch-video). Unclear → content-os-router.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
compatibility: Orchestrates content-os-core (HTML composition + Playwright/FFmpeg render adapter), content-os-creative (brand variables, tokens), content-os-media (asset freeze, provenance manifest). Input = Figma link or fileKey:nodeId. Output = frozen local assets + composition variables + reconstructed components. Render sees local files only (no network). Applies ON TOP of content-os-embedded-captions for caption overlay. Output RENDERED_DRAFT.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Figma → Frames ContentOS composition

Derivada de `figma` (`heygen-com/hyperframes`, Apache-2.0). Locally-authored adaptation for
the Frames ContentOS toolchain (HTML composition → Playwright render → MP4).

## What this skill does

Brings the user's Figma work into a Frames ContentOS composition. Imports split by capability:

| Phase | What                | Surface                                                                       |
| ----- | ------------------- | ----------------------------------------------------------------------------- |
| 1     | Static assets       | frozen under `assets/figma/` with provenance                                  |
| 2     | Brand tokens/styles | composition variables + `figma-tokens.json` sidecar                           |
| 3     | Components → HTML   | reconstructed at exact Figma geometry under `compositions/components/<name>/` |
| 4     | Storyboard sections | element timelines (frames are keyframes, not slides)                          |

Every import freezes assets locally with recorded provenance — renders never call Figma.

## Auth — scoped, read-only

Preflight before the first import: check the Figma access token exists in the shell
environment or the project environment file (read-only scopes only — File content:
Read-only, File metadata: Read-only). If neither, do NOT run the import to harvest the
error — walk the user through one-time setup, then stop and wait. Never ask the user to
paste the token into the conversation. This integration never writes to Figma.

`BAD_TOKEN` (401) → re-mint. `FORBIDDEN` (403) → message names the missing scope; add it or the file isn't visible. `RATE_LIMITED` (429) → back off; batch parent-frame requests, cache raw responses.

## Routing

Parse the user's Figma link (`fileKey:nodeId`, URL, or bare `fileKey`). Intent maps to the
phase table above (Asset / Tokens / Component / Storyboard).

Narrate every step: before each import say what you'll pull; after, say where the artifact
landed (frozen path / sidecar / component dir), what changed in the composition, and the
immediate next action.

## Assets (Phase 1)

Render the node over REST (media adapter), sanitize SVG, freeze under
`assets/figma/`, append the provenance manifest (`assets/figma-index.jsonl`), print an
`<img>` snippet. Idempotent per `fileKey:nodeId:format:scale:version`. Prefer SVG for
vectors/logos, PNG `--scale 2` for raster. Record a description (becomes index row + `<img alt>`); batch same-file nodes in one request.

## Tokens (Phase 2)

Import variables as composition brand-variable entries + `figma-tokens.json` sidecar +
binding-index records (`assets/figma-bindings.jsonl`). Variables are Enterprise-gated
upstream; on other plans degrade to published-style metadata (resolves at
component-import time). Add printed entries to `data-composition-variables`. **Import
tokens before components** when both are wanted — component colors then link to brand
variables instead of baking duplicates.

The runtime defines every composition variable as a CSS custom property, so imported
`var(--slug, literal)` re-brands every imported component when
`data-composition-variables` changes — no re-import.

## Components (Phase 3)

Node tree → editable HTML at exact Figma geometry, packaged under
`compositions/components/<name>/`. Vectors/boolean-ops auto-rasterize via Phase-1 export.
Binding pass (exact-ID only, never value match):

- Fill bound to an **imported** token → `var(--slug, #literal)` — brand refresh propagates.
- Bound to an **unknown** token → literal + `data-figma-unresolved` flag. Offer the user:
  run tokens on the source file, then re-import the component to link them. Ask **once**
  per unknown library which file it is — never guess, never match by hex.

**Static fidelity self-check (mandatory for hero content):** after importing, render the
fragment and compare against Figma's own pixels. Text is the known drift axis. If
comparison shows drift the mapper doesn't cover, report it — never hand-tweak silently.

## Storyboards (a SECTION of scene frames → animation)

**Cardinal rule: storyboard frames are KEYFRAMES, not slides.** Two frames containing the
same element describe that element's state through time — animate the ELEMENT between
states; never play frames as a sequence of stills. A logo in four frames at descending y
is ONE element rising through four keyframes.

Decode the storyboard grammar mechanically — don't eyeball:

1. **Scene units**: every frame-sized node is a scene (FRAMEs, loose full-frame
   RECTANGLEs). Filter by size (≈ composition aspect), not type or name.
2. **Order = x-position** (row-major if the strip wraps). Sort scenes by
   `absoluteBoundingBox.x`.
3. **Diff adjacent frames into element chains** — where the animation lives. Match
   children across consecutive frames: first by **name** (same name = same element → tween
   relative x/y/w/h between states), then by **geometry similarity** (similar size + nearby
   center = same element whose pixels changed → crossfade the two exports in place while
   tweening geometry). Unmatched children enter/exit at their scene's beat. Export ONE
   asset per chain — never one still per frame.
4. **Stills are the fallback, not the default** — only for frames that don't decompose.
5. **Director notes**: TEXT nodes below the strip are motion intent, paired to the scene
   whose x-range they overlap. They describe _how_ to animate — not on-screen copy.
6. Note verbs → transitions: EXPLOSION/BURST → incoming scale ~1.5→1 + fade, `power3.out`;
   SLIDES/SLIDE TO THE → directional slide in from that edge; MORPH/REVEALS → crossfade;
   CYCLE THROUGH/EACH ONE → longer hold.
7. **Escalation — frames depict ONE product UI → rebuild the app, not element chains.**
   When every frame is the same app screen in successive states, rebuild as live DOM
   (component import for parts that change state, real exported pixels for static chrome —
   **code what changes state, freeze what doesn't**) and treat each frame delta as an
   **interaction**, not a tween. Result reads as one continuous screen recording.
8. One `main` timeline sequences everything (opacity/x/y per scene at absolute times) — no
   per-scene sub-compositions needed for an animatic.

## Determinism contract (inherited from content-os-core)

- No `Math.random()` / `Date.now()` / `new Date()` / `fetch()` / `setTimeout()` / `setInterval()` in composition or component code.
- GSAP timelines `paused: true`, driven by the frame clock (`window.__timelines`, `data-start`, `data-duration`); never `repeat: -1`.
- No network in the render path — all Figma I/O at import time; never leave a Figma URL in the composition.
- `RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED`.

## Dependencies

- `content-os-core` — HTML composition contract + Playwright render adapter.
- `content-os-creative` — brand variables, tokens, lexicon.
- `content-os-media` — asset freeze, provenance manifest.
- Toolchain: Playwright 1.61.1, FFmpeg (libx264), GSAP 3.15.0 (all pinned in `package.json`).

## Check

`node skills/content-os-figma/scripts/check-skill.mjs` — verifies required files, pinned
deps, contract tokens, forbidden APIs absent, negative fixture documents violations.
