---
name: content-os-seam-craft
description: This skill should be used when the user asks to "fix a white flash at a cut", "make transitions composite correctly on the master timeline", "reason about why a transition opacity dip shows through", "verify the render-side mechanics of overlapping scene wrappers", "paint the stage ground", or "assemble index.html for scene seams". Render-correctness doctrine for scene-to-scene seams in the Content OS toolchain — the prerequisites that make transitions composite correctly on the master timeline. Covers the opaque stage-ground (#root background) white-flash guard and how the injector overlaps wrappers, holds final frames, ping-pongs tracks, and stamps lint-clean template code onto the master timeline. Does NOT contain the per-transition catalog — see content-os-cut-the-curve. Unclear → content-os-router.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Render prerequisites for the seam transitions in content-os-cut-the-curve (the catalog) and the gateway content-os-motion-doctrine (vector law + seam gate). Orchestrates content-os-core (HTML composition + Playwright/FFmpeg render adapter). Input = master timeline (index.html) + scene wrappers (#el-<sid>). Output = opaque stage ground + overlap-stamped seams + RENDERED_DRAFT. The transitions this doctrine governs are Tier-B-ready: pure transform / opacity / filter on the two scene clip wrappers, no injected overlay DOM, no per-scene cooperation.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Seam Craft — render prerequisites for scene-to-scene transitions

Derivada de `seam-craft` (`heygen-com/hyperframes`, Apache-2.0). Locally-authored
adaptation for the Content OS toolchain (HTML composition → Playwright render → MP4).
Vendor reference: `skills/vendor/hyperframes/seam-craft/SKILL.md` (read-only).

This is the **render-correctness doctrine** for Content OS scene-to-scene seams: the
prerequisites and master-timeline mechanics that make any transition composite
correctly, independent of which specific transition is chosen. The per-transition
catalog (crossfade, push-slide, zoom-through, cut-the-curve, …) lives in
`content-os-cut-the-curve` — this page is the doctrine that sits underneath all of them.

The transitions this doctrine governs are **Tier-B-ready**: pure transform / opacity /
filter on the two scene **clip wrappers** (`#el-<sid>`), no injected overlay DOM, no
per-scene cooperation. Overlay families (staggered blocks, blinds, light leak, grid
dissolve, page burn) and shader transitions are deferred to later phases.

## Stage ground prerequisite (white-flash guard)

Several templates open a window where the two wrappers' summed opacity < 1 (the
cut-the-curve mid-window cut, zoom-through's 0.15 floor, plain crossfade's
power-curve dip). Whatever is BEHIND the wrappers shows through during that
window. If the assembled `index.html` `#root` has no opaque background, the
renderer composites the dip over its default **white** page → a white flash at
every seam, glaring on dark films. **The assembler must paint the stage:**
`#root { background: var(--canvas-deep, var(--canvas, #000)) }` — any consumer of
these templates owns the same guarantee.

## How the injector applies a transition

At a `break` boundary between scene _i_ (`from`) and scene _i+1_ (`to`), the
injector:

1. Extends `#el-<from>` wrapper `data-duration` by `duration_s` (holds its final
   frame).
2. Pulls `#el-<to>` wrapper `data-start` earlier by `duration_s` (creates the
   overlap window).
3. Reassigns **all** clip `data-track-index` as a 0/1 ping-pong so the two
   overlapping wrappers never share a track (same-track overlap is illegal).
   Higher track composites on top.
4. Stamps the `gsap_template` into `window.__timelines["main"]` at
   `T = overlap-start`.

The master-timeline wrapper tween is seeked and rendered (no double-seek with
the sub-comp's own paused timeline — the runtime drives them independently), the
extended wrapper holds scene _i_'s final frame, and the higher-track incoming
wrapper composites over + blends with the outgoing one.

## Template placeholders

The injector substitutes these tokens in each `gsap_template` line:

| Token                              | Meaning                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------ |
| `__OLD__`                          | `"#el-<from>"` — outgoing clip wrapper selector (quoted)                 |
| `__NEW__`                          | `"#el-<to>"` — incoming clip wrapper selector (quoted)                   |
| `__T__`                            | overlap-start time in seconds (master clock)                             |
| `__DUR__`                          | `duration_s` for this boundary                                           |
| `__DX__`                           | horizontal travel for directional types: `-1920` (LEFT) / `1920` (RIGHT) |
| `__DY__`                           | vertical travel: `-1080` (UP) / `1080` (DOWN)                            |
| `__ORIGIN_OUT__` / `__ORIGIN_IN__` | transformOrigin pair for `squeeze`                                       |

`filter` / `scaleX` / `transformOrigin` are lint-clean on the master timeline —
the x/y/scale/rotation/opacity whitelist is a _scene-worker_ prompt rule only; it
does not bind index.html.

## Determinism contract (inherited from content-os-core)

- No `Math.random()` / `Date.now()` / `new Date()` / `fetch()` / `setTimeout()` /
  `setInterval()` in any seam-assembly or render code.
- GSAP timelines `paused: true`, driven by the Content OS frame clock
  (`window.__timelines`, `data-start`, `data-duration`).
- No network in the render path.
- `RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED`.

## Dependencies

- `content-os-cut-the-curve` — the per-transition catalog this doctrine sits under.
- `content-os-motion-doctrine` — the gateway (vector law + Seam Gate).
- `content-os-core` — HTML composition contract + Playwright render adapter.
- Toolchain: Playwright 1.61.1, FFmpeg (libx264), GSAP 3.15.0 (all pinned in `package.json`).

## What this skill does NOT do

- Does not contain the per-transition catalog (see content-os-cut-the-curve).
- Does not leave `#root` transparent (paint the stage — white-flash guard).
- Does not permit same-track wrapper overlap (ping-pong data-track-index 0/1).
- Does not inject overlay DOM or require per-scene cooperation (Tier-B-ready only).
- Does not activate connectors or publish; no network in the render path.
- Does not persist chain-of-thought, secrets, PII, or private locators.

## Check

`node skills/content-os-seam-craft/scripts/check-skill.mjs` — verifies required
files, pinned deps, contract tokens, forbidden APIs absent, negative fixture
documents violations.
