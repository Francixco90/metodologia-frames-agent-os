# Oversized Cursor — receta (size/look, entry, tip-targeting, click, exit, checklist, anti-patterns)

Offloaded from `SKILL.md` (gateway router). Gobernado por `scripts/check-skill.mjs`
required list + `package_manifest_sha256`. No content cut — relocated.

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