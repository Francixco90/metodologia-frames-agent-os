---
name: content-os-cut-the-curve
description: This skill should be used when the user asks to "pick a transition", "author a seam", "velocity-match a cut", "do the waterfall cut", "rack-focus blur-cut", "waterfall entry cascade", "nudge curve group slide", "zoom-through", "inverse zoom-through", or "cut the curve between scenes". Technique catalog — five velocity-matched SEAMS plus two in-scene techniques. The seam LAW lives in content-os-motion-doctrine; read it first. Unclear → content-os-router.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
compatibility: Seam catalog governed by content-os-motion-doctrine (gateway — read FIRST). Orchestrates content-os-core + content-os-seam-craft. Input = scene plan + vector ledger. Output = velocity-matched seam tweens + RENDERED_DRAFT. transform/opacity/filter only on clip wrappers (#el-<sid>).
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Cut the Curve — the technique catalog

Derivada de `cut-the-curve` (`heygen-com/hyperframes`, Apache-2.0). Locally-authored
adaptation for the Frames ContentOS toolchain (HTML → Playwright → MP4). Vendor reference:
`skills/vendor/hyperframes/cut-the-curve/SKILL.md` (read-only).

One principle: **cut at peak velocity, match direction and speed on both sides of the cut.**
The seam LAW — vector law, the current, the ledger, the Seam Gate — lives in
`content-os-motion-doctrine`; read it first. This skill is the parameters and mechanics.

## Catalog

Five SEAM techniques + two in-scene techniques. Load only the module needed and return to
this router for the gates.

| #   | Technique                  | Scope                          | Axis                | Module                         |
| --- | -------------------------- | ------------------------------ | ------------------- | ------------------------------ |
| 1   | **Zoom-Through** (forward) | Within-scene text swap         | Z, toward viewer    | `references/zoom-through.md`   |
| 2   | **Inverse Zoom-Through**   | Arrival / payoff beat          | Z, away from viewer | `references/inverse-zoom-through.md` |
| 3   | **Cut the Curve**          | Between scenes                 | X / Y               | `references/cut-the-curve.md`  |
| 4   | **Waterfall Cut**          | Text-to-text seam              | X, per-word         | `references/waterfall-cut.md`   |
| 5   | **Rack-Focus Blur-Cut**    | Same-surface state swap        | X / Y / Z           | `references/rack-focus-blur-cut.md` |
| 6   | **Waterfall Entry**        | In-scene ARRIVAL (no seam)     | Y, from below       | `references/waterfall-entry.md` |
| 7   | **Nudge Curve**            | In-scene group slide (no seam) | X / Y               | `references/nudge-curve.md`     |

## Z sign and blur scale

On Z the sign of d(scale)/dt must match across the cut. Push (forward): exit growing
`1 → 1.2`, entry growing `0.75 → 1`. Pull (back): exit shrinking `1 → 0.8`, entry shrinking
`1.25 → 1`. Banned mirror: receding exit + grow-from-small entry (pull flips to push). The
incoming scene's OWN entrances are bound during the seam window (cut + ~0.5s): hold composed,
or match the sign (Seam Gate rule 7). Peak blur: **10px** text-scale (20px smears
letterforms); **18–20px** full-frame. Same peak both sides at the swap; blur the WRAPPER,
never children.

## Partial travel

~12% of frame (≈230px at 1920) — never full off-screen moves. Mirrored eases
(`power4.in` / `power4.out`), same distance and duration, are the two halves of one
`power4.inOut`; velocity matches at the cut. `scale-sign` discipline verifies per Seam Gate
rule 7.

## Anti-patterns

Two texts visible during a zoom-through; inverse-zoom exit → grow-from-small entry (or
push → oversized retraction); full off-screen exits/entries; `.inOut` eases on either side
of a cut; queued entries (each waits for the previous to settle); single ease for a group
slide (`power4.inOut`, `slow()`). Fixes: hard cut at blur peak; match the scale-velocity
SIGN; partial travel + early fade; mirrored `power4.in` / `power4.out`; overlap ±1–2 frames
(the cascade is a wave); the nudge-curve three-phase chain.

## Determinism, deps, check

No `Math.random()` / `Date.now()` / `new Date()` / `fetch()` / `setTimeout()` /
`setInterval()` in seam/composition code. GSAP timelines `paused: true`, driven by the frame
clock (`window.__timelines`, `data-start`, `data-duration`). No network in render path.
`RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED`.

Deps: `content-os-motion-doctrine` (gateway: vector law, the current, the Seam Gate),
`content-os-seam-craft` (opaque stage ground / white-flash guard), `content-os-core`
(composition + adapter). Toolchain Playwright 1.61.1, FFmpeg (libx264), GSAP 3.15.0 (pinned
in `package.json`). Check:
`node skills/content-os-cut-the-curve/scripts/check-skill.mjs`.