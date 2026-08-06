---
name: content-os-oversized-cursor
description: This skill should be used when the user asks to "add a cursor", "oversized pointer", "eye-carrier", "walk the eye to the target", "click to ignite the next beat", "cursor entry", "tip-targeting", "click tap", "cursor handoff", "brand-motif cursor", "off-screen cursor entry", or "the scene reads as dead and needs cheap motion". The oversized macOS-style cursor technique for the Frames ContentOS toolchain — a deliberately oversized pointer that enters from off-screen, walks the viewer's eye to the next point of interest, clicks to cause the next thing that happens, and leaves. Covers size/look (7cqw full-frame, brand-motif cursors), the off-screen entry law, tip-targeting with transformOrigin '21% 14%', the asymmetric 1:2 click tap, click-ignites-the-next-beat, drift-aside during long beats, and the two physical exits (off-frame + cut-the-curve handoff). The motion LAW (vector law, the current, no idle wobble) lives in content-os-motion-doctrine; read it first. Unclear → content-os-router.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
compatibility: Implements the oversized cursor eye-carrier technique governed by content-os-motion-doctrine (the gateway — read FIRST). Orchestrates content-os-core (HTML composition + Playwright/FFmpeg render adapter) and content-os-seam-craft (render prerequisites / opaque stage ground). Handoff variant reuses content-os-cut-the-curve. Input = scene plan + cursor beats. Output = cursor entry/tap/drift/exit tweens + RENDERED_DRAFT. GSAP code templates are worker-authored (scene worker) and registry gsap_templates; transform-only tweens on the cursor element (transform/opacity/filter only).
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Oversized Cursor — the eye-carrier

Derivada de `oversized-cursor` (`heygen-com/hyperframes`, Apache-2.0). Locally-authored
adaptation for the Frames ContentOS toolchain (HTML composition → Playwright render → MP4).
Vendor reference: `skills/vendor/hyperframes/oversized-cursor/SKILL.md` (read-only).

A deliberately oversized macOS-style pointer that travels the frame as a _visible
protagonist_: it enters from off-screen, walks the viewer's eye to the next point of
interest, clicks to cause the next thing that happens, and leaves. The motion LAW —
vector law, the current, no idle wobble, the Seam Gate — lives in
`content-os-motion-doctrine`; read it first. This skill is the cursor mechanics.

**Why it exists.** Big cursor movement is one of the cheapest high-yield motion sources
in a launch video: one element, transform-only tweens, and it (1) brings the eye across
the screen on scenes that would otherwise read as dead, (2) gives causal ignition to
morphs/transitions ("the click did that"), and (3) segments the eye out of a stale state
when kicking off a new scene or a complex animation sequence. Bigger is better — an
actual-size cursor disappears at video scale.

## Receta — router

Full size/look CSS + entry/tap/exit JS code templates + checklist + anti-patterns lives
in `references/cursor-receta.md` (governed, hash-bound). Load the receta antes de build.

| Técnica                   | Where en receta                                      | Ley / tokens                                                                                          |
| ------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Size & look               | `references/cursor-receta.md` § Size & look          | `7cqw` full-frame (4.6–5.5cqw in-mock); brand-motif cursor power play; CSS template                  |
| Entry law                 | `references/cursor-receta.md` § Entry law            | off-screen entry, one decelerating glide, `power3.out`, 0.4–0.92s. Never fade/mask reveal             |
| Tip-targeting & click tap | `references/cursor-receta.md` § Tip-targeting         | tip-targeting on arrow TIP; `transformOrigin: '21% 14%'`; asymmetric 1:2 tap `power2.in`/`power2.out` |
| Click ignites next beat   | `references/cursor-receta.md` § Click IGNITES        | click-ignites the next beat same-frame; drift aside during long beats; no idle wobble                 |
| Exit law & handoff        | `references/cursor-receta.md` § Exit law             | physical exits only: off-frame (`power2.in`) or cut-the-curve handoff. Never fade-in-place             |
| Checklist                 | `references/cursor-receta.md` § Checklist            | 6-point pre-ship check (size, entry, tip, click, drift, exit)                                         |
| Anti-Patterns             | `references/cursor-receta.md` § Anti-Patterns        | 11 don't/instead pairs (actual-size, fade-in, mask-reveal, center-pivot, symmetric ease, idle wobble) |

## Determinism contract (inherited from content-os-core)

- No `Math.random()` / `Date.now()` / `new Date()` / `fetch()` / `setTimeout()` /
  `setInterval()` in any cursor or composition code.
- GSAP timelines `paused: true`, driven by the Frames ContentOS frame clock
  (`window.__timelines`, `data-start`, `data-duration`).
- No network in the render path.
- `RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED`.

## Dependencies

- `content-os-motion-doctrine` — the gateway (vector law, the current, no idle wobble,
  the Seam Gate).
- `content-os-seam-craft` — render prerequisites (opaque stage ground / white-flash
  guard) for the cut-the-curve handoff window.
- `content-os-cut-the-curve` — the handoff variant reuses the velocity-matched
  cross-scene carry.
- `content-os-core` — HTML composition contract + Playwright render adapter.
- Toolchain: Playwright 1.61.1, FFmpeg (libx264), GSAP 3.15.0 (all pinned in `package.json`).

## What this skill does NOT do

- Does not author cursor beats without the motion doctrine gateway (read
  content-os-motion-doctrine first).
- Does not allow opacity-fade-in-place entries or exits (physical only).
- Does not permit mask-reveal entries (reads as a glitch).
- Does not press-pivot on the box center (pivot on the tip `21% 14%`).
- Does not permit idle wobble (own the beat or drift aside).
- Does not activate connectors or publish; no network in the render path.
- Does not persist chain-of-thought, secrets, PII, or private locators.

## Check

`node skills/content-os-oversized-cursor/scripts/check-skill.mjs` — verifies required
files, pinned deps, contract tokens, forbidden APIs absent, negative fixture documents
violations.