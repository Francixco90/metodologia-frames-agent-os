---
name: content-os-oversized-cursor
description: This skill should be used when the user asks to "add a cursor", "oversized pointer", "eye-carrier", "walk the eye to the target", "click to ignite the next beat", "cursor entry", "tip-targeting", "click tap", "cursor handoff", "brand-motif cursor", "off-screen cursor entry", or "the scene reads as dead and needs cheap motion". The oversized macOS-style cursor technique for the Frames ContentOS toolchain — a deliberately oversized pointer that enters from off-screen, walks the viewer's eye to the next point of interest, clicks to cause the next thing that happens, and leaves. Covers size/look (7cqw full-frame, brand-motif cursors), the off-screen entry law, tip-targeting with transformOrigin '21% 14%', the asymmetric 1:2 click tap, click-ignites-the-next-beat, drift-aside during long beats, and the two physical exits (off-frame + cut-the-curve handoff). The motion LAW (vector law, the current, no idle wobble) lives in content-os-motion-doctrine; read it first. Unclear → content-os-router.
version: 0.1.0
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

## Size & look (house convention)

- **Full-frame scenes: `7cqw`** (≈134px at 1920). In-mock / small-frame variants:
  `4.6–5.5cqw`. Never smaller.
- One SVG arrow geometry everywhere. Two proven fills — white body + black stroke, or
  black body (`#1c1c1c`) + white stroke (1.4px). Pick per scene contrast, keep it
  constant per film.
- **Brand-motif cursors (the power play).** The macOS arrow is the DEFAULT, not a
  mandate. When the subject brand has a recognizable cursor identity — a collaborative
  design tool's colored multiplayer arrow with a name tag (Figma-style), a creative
  suite's precision crosshair, a distinctive product pointer — use THAT cursor instead:
  instantly legible brand language for anyone who knows the product. Same laws apply
  unchanged (oversized scale, physical entry/exit, tip-targeting, click-ignition), and a
  name-tag variant travels as one rigid unit (tag trailing the arrow). Reach for it only
  when the motif is genuinely referenceable; a cursor nobody recognizes is just a weird
  arrow — default back to macOS.
- `filter: drop-shadow(0 4px 6px rgba(0,0,0,.3))`, `pointer-events: none`, `z-index` above
  all scene content, `will-change: transform`.

```css
#root .cursor {
  position: absolute;
  left: 48%;
  top: 115%; /* off-screen below — the resting pose IS off-screen */
  width: 7cqw;
  height: 7cqw;
  z-index: 20;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3));
  pointer-events: none;
  will-change: transform;
}
```

## Entry law — physical, never revealed

The cursor **always enters from off-screen** (canonical: from below, `top:115–120%`)
and travels to its first target in one decelerating glide. It must _feel like it entered
the room_. Never opacity-fade it in at a resting position, never mask-reveal it — that
reads as a glitch (a real, repeatedly observed failure mode).

- Default path: **straight up the y-axis** to the target — no fragmented diagonals. A
  diagonal is fine when it IS the story (entering toward an off-axis target), but it is
  one continuous vector either way.
- `duration: 0.4–0.92s`, `ease: power3.out`, `immediateRender: false` on the fromTo.

```js
// cursor entry — one decelerating glide from off-screen below
tl.fromTo(
  cursor,
  {left: '48.6%', top: '115%'},
  {left: '48.6%', top: '55%', duration: 0.85, ease: 'power3.out', immediateRender: false},
  0.25,
);
```

## Tip-targeting & the click tap

The hot-spot is the arrow TIP, not the box center. Land the **tip** on the target's
center, and pivot all press scaling on the tip: `transformOrigin: '21% 14%'` (for the
house arrow path in a 24-unit viewBox).

Click = asymmetric compress/expand (1:2 ratio reads as a real tap):

```js
// click tap — asymmetric 1:2, pivots on the tip
tl.to(cursor, {scale: 0.84, duration: 0.1, ease: 'power2.in', transformOrigin: '21% 14%'}, t);
tl.to(cursor, {scale: 1, duration: 0.22, ease: 'power2.out', transformOrigin: '21% 14%'}, t + 0.1);
```

**The target's reaction is a separate, parallel tween** (button: `scale: 0.94` + press
color/shadow, starting at the same `t`). Cursor-only taps (e.g. focusing a text input)
get NO target reaction. Pair the target side with `cursor-click-ripple` /
`press-release-spring`.

## The click IGNITES the next beat

Never let a morph, typing run, window transform, or scene-defining animation simply
_start_. Park the cursor on the trigger and let the click cause it, same-frame:

- click ▸ menu/submenu cascade, toggle flip
- click ▸ typing kickoff into an input
- click ▸ composer morph-down / window shrink
- click ▸ logo ignition / flight launch
- click ▸ play-state flip + UI-life wake in a product mock

During long beats it doesn't own (typing, narration), the cursor **drifts aside**
(0.5–0.9s, `power2.out`) — never sits frozen on top of the action, never wobbles idly.
**No idle wobble**: the cursor either owns the beat (walking the eye, clicking) or
drifts aside; it never jitters in place.

## Exit law & cross-scene handoff

Two sanctioned exits — both physical, **never an opacity fade in place**:

1. **Leave the frame**: accelerate off the nearest edge with `power2.in`
   (`left:'118%'`, `left:'-12%'`, or `top:'116%'`), 0.5–0.7s.
2. **Cut-the-curve handoff**: in the final ~0.3s before a hard cut, the cursor starts
   accelerating (`power2.in`) toward the NEXT scene's first click point, covering the
   first ~1/3 of that path; the next composition `gsap.set`s the cursor at the handoff
   pose and continues with `power2.out` at matched velocity. The cursor itself becomes
   the carrier element that stitches the seam (see `content-os-cut-the-curve`):

```js
// scene A, last 0.3s — start the journey:
tl.to(cursor, {left: '40.7%', top: '63.7%', duration: 0.3, ease: 'power2.in'}, CUT - 0.3);
// scene B, t=0 — finish it at matched velocity:
gsap.set(cursorB, {left: '40.7%', top: '63.7%'});
tl.to(cursorB, {left: '22%', top: '45%', duration: 0.6, ease: 'power2.out'}, 0);
```

## Checklist

- [ ] ≥ 7cqw full-frame (4.6–5.5cqw inside a mock) — when unsure, bigger
- [ ] enters from off-screen on one continuous vector (no fade/mask reveal)
- [ ] tip lands on the target center; press pivots on `transformOrigin: '21% 14%'`
- [ ] every click causes something, same-frame
- [ ] drifts aside during beats it doesn't own; zero idle wobble
- [ ] exits physically (off-frame or cut-the-curve handoff) — no fade-in-place

## Anti-Patterns

| Don't                                            | Instead                                                         |
| ------------------------------------------------ | --------------------------------------------------------------- |
| Actual-size cursor at video scale                | ≥ 7cqw full-frame; bigger when unsure                           |
| Opacity-fade the cursor in at a resting position | Physical off-screen entry on one continuous vector              |
| Mask-reveal the cursor in                        | Physical entry — mask-reveal reads as a glitch                  |
| Press pivoting on box center                     | `transformOrigin: '21% 14%'` — pivot on the tip                 |
| Symmetric click ease (1:1)                       | Asymmetric 1:2 (`power2.in` 0.1s / `power2.out` 0.22s)          |
| Morph/typing/transition that simply starts       | Click ignites it, same-frame                                    |
| Cursor frozen on top of a beat it doesn't own    | Drift aside 0.5–0.9s `power2.out`                               |
| Idle wobble / jitter in place                    | Own the beat or drift aside — no idle wobble                    |
| Opacity fade in place to exit                    | Physical exit: off-frame (`power2.in`) or cut-the-curve handoff |
| Brand-motif cursor nobody recognizes             | Default back to macOS arrow                                     |
| Name-tag variant where tag lags the arrow        | Travels as one rigid unit                                       |

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
