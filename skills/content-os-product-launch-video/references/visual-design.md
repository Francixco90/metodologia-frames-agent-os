# Visual Design — Product Launch Video

Reference for Step 4 (frame visual design). Orchestrator loads on-demand. Pairs
with `content-os-animation` blueprints + `content-os-creative` frame preset.

## Time-coded shot sequence (per frame)

Each frame in `STORYBOARD.md` gets a `## Video direction` block:

```md
### Frame 02 — feature reveal

Shot 1 (0.0-3.0s): product UI screenshot enters from right, settles center.
Shot 2 (3.0-7.0s): camera pushes in on the key control; label callout fades in.
Shot 3 (7.0-12.0s): result stat count-ups to final value; CTA chip appears.

## Video direction

- Motion: fromTo x 80->0 (shot 1), fromTo scale 1->1.15 (shot 2), count-up (shot 3).
- Caption: "Set it once. It just runs." (shot 2-3).
- Asset: asset_candidates [cap-screenshot-01 (focal)].
```

- One `focal` per shot. Supporting elements dim or desaturate.
- Shot cuts align to beat boundaries (story-design.md).
- Transitions between shots within a frame = GSAP timeline (seek-safe,
  `paused: true`), NOT CSS `transition:`.

## Brand tokens remix (Step 2 output)

Capture `tokens.json` → preset color keys by role:

| tokens.json      | preset role | fallback (empty tokens) |
| ---------------- | ----------- | ----------------------- |
| colors.primary   | accent      | preset.accent           |
| colors.secondary | accent-2    | preset.accent-2         |
| colors.surface   | surface     | preset.surface          |
| colors.text      | text        | preset.text             |
| fonts.heading    | heading     | preset.fonts.heading    |
| fonts.body       | body        | preset.fonts.body       |

- Empty tokens (no-capture path) → preset palette own, complete design. No
  "placeholder brand" — commit to the preset.
- Fonts swapped only if capture family available locally (offline-first); else
  preset font stack. No Google Fonts CDN in frames.

## Frame preset selection

`content-os-creative` presets. User may name `style_preset` in brief; else
judgment call by archetype:

- feature-reveal / stat-led → `bold-numeric` (large type, count-ups).
- tour-walkthrough → `clean-tour` (real screenshots, minimal chrome).
- founder-story → `editorial-doc` (lower-thirds, doc feel).
- problem-solution → `contrast-split` (before/after split).

Preset recorded in `workflow-state.yml` (`style_preset`).

## Product UI treatment (tours / showcases)

- Real screenshots as `focal`/`asset_candidates`. Do NOT rebuild product UI in
  HTML (use captured stills).
- Animate a viewport rectangle panning over `full-page.png` to simulate scroll.
- Highlight real controls with callout labels (GSAP `fromTo autoAlpha`).
- Keep screenshot aspect ratio; crop, don't distort.

## Determinism + seek-safe (inherited)

- GSAP timelines `paused: true`, registered `window.__timelines[id]`, scrubbed
  via `seek(frame/fps)`.
- No `Date.now()`/`Math.random()`/`new Date()`/`performance.now()`/`fetch`/
  `setTimeout`/`setInterval`/`getBoundingClientRect` in compositions.
- No `repeat: -1`, no relative `+=`, no CSS `transition:` on animated elements.
- Finite repeats (≤2), stagger cap ≤0.5s, transform aliases only.

## Credits / CTA close

Final frame: CTA + brand lockup. Not a "credits scroll" (that's pr-to-video).
Product launch closes on action: "Try it" / "Sign up" / "Learn more" + brand
mark. Duration 4-6s.
