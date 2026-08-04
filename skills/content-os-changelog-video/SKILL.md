---
name: content-os-changelog-video
description: This skill should be used when the user asks to "make a changelog video", "turn a weekly digest into a video", "branded changelog .md to mp4", "weekly release video", or "visualize a changelog". Turns a weekly changelog .md into a finished branded changelog video (square 1080, ~45-60s, Annie VO, animated brand background, mock-UI visualizations, lowkey captions). Self-contained — fonts, background, lexicon, and scripts ship in this skill. Unclear → content-os-router.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Orchestrates content-os-core (HTML composition + Playwright/FFmpeg render adapter), content-os-motion-graphics (mock-UI visualizations, animated background), content-os-embedded-captions (lowkey captions), content-os-creative (brand background, fonts, lexicon), content-os-media (VO generation, background track). Input = changelog .md (themes + items). Prime directive: visualize don't list. Output RENDERED_DRAFT (renders/video.mp4, mock-UI visualizations + VO + captions).
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Changelog → Branded Video

Derivada de `changelog-video` (`heygen-com/hyperframes`, Apache-2.0). Locally-authored
adaptation for the Content OS toolchain (HTML composition → Playwright render → MP4).
Vendor reference: `skills/vendor/hyperframes/changelog-video/SKILL.md` (read-only).

## What this skill does

Input: a changelog .md (themes + items, like a weekly digest). Output: a lint-clean,
seam-gate-green Content OS project in `videos/weekly-changelog-<range>/`. Render only
when asked.

**Load first, non-negotiable:** `content-os-motion-graphics` (mock-UI visualizations),
`content-os-embedded-captions` (lowkey captions), `content-os-creative` (brand background,
fonts, lexicon). This skill supplies the changelog-specific pipeline; the siblings supply
the motion law and caption contract.

## The prime directive: visualize, don't list

Every theme is illustrated by an **animated mock of the actual UI or a faithful analog**
acting out the change in experience — never text bullets. Route every theme/item through
the visualization registry BEFORE writing the script; the registry decides
`ui-recreate` / `ui-analog` / `terminal` / `checklist`. Text checklist is the LAST resort,
reserved for genuinely non-visual items (reliability fix lists).

## Pipeline

### Step 0 — bootstrap the project from this skill's assets

Do this before writing any composition HTML. The skill's assets, fonts, and scaffold are
the skill; the SKILL.md is a router.

- Copy brand fonts to `project/assets/fonts/`.
- Stage the background track at `project/bgm.mp3` (via `content-os-media`).
- Build the looping animated background (`content-os-motion-graphics` mock).
- Copy the master skeleton to `project/index.html`.

### Step 1 — parse the changelog .md

Read the changelog. Extract themes (each with a heading + items). For each theme, decide
the visualization kind via the registry: `ui-recreate` (animate the actual UI),
`ui-analog` (a faithful stand-in), `terminal` (a CLI mock), or `checklist` (last resort).

### Step 2 — write the script

Write the VO script (Annie voice, ~45-60s). Each theme gets one sentence + one
visualization. The script references the visualization kind per theme. Write `script.md`
with timed lines (start, end, text, visualization_ref).

### Step 3 — build visualizations

For each theme, write a mock-UI composition (`visualizations/NN-<theme>.html`). Each mock
animates the change in experience — a button appearing, a panel sliding, a counter
ticking. GSAP timelines (`gsap.timeline`, `paused: true`) keyed to the Content OS clock
contract (`window.__timelines`, `data-start`, `data-duration`). No `Math.random`, no
`Date.now`, no `fetch`, no `setTimeout`, no `setInterval` (determinism contract).

### Step 4 — assemble

Assemble `index.html`: the looping brand background, the visualizations sequenced on the
master timeline, the lowkey captions track (via `content-os-embedded-captions`), and the
VO audio (Annie, via `content-os-media`). The composition declares `data-composition-id`,
`data-duration`, and the timeline clock.

### Step 5 — render

Render `index.html` to `renders/video.mp4` via the Content OS render adapter
(`content-os-core/scripts/render-html.ts`): Playwright + FFmpeg (`libx264`, `image2pipe`),
frame clock deterministic, no network in the render path. Mux the VO audio.

## Visualization registry (route before writing)

| kind        | when                                             | shape                              |
| ----------- | ------------------------------------------------ | ---------------------------------- |
| ui-recreate | the change is visible in the real UI             | animate the actual component/panel |
| ui-analog   | the change is abstract but visualizable          | a faithful stand-in mock           |
| terminal    | the change is a CLI / config / log behavior      | animated terminal mock             |
| checklist   | the change is non-visual (reliability, perf fix) | text checklist (LAST resort)       |

## Determinism contract (inherited from content-os-core)

- No `Math.random()` / `Date.now()` / `new Date()` / `fetch()` / `setTimeout()` /
  `setInterval()` in any visualization or composition code.
- GSAP timelines `paused: true`, driven by the Content OS frame clock.
- No network in the render path. Remote media adapters fail-closed (`content-os-media`).
- `RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED`.

## Dependencies

- `content-os-core` — HTML composition contract + Playwright render adapter.
- `content-os-motion-graphics` — mock-UI visualizations, animated background.
- `content-os-embedded-captions` — lowkey captions track.
- `content-os-creative` — brand background, fonts, lexicon.
- `content-os-media` — VO generation (Annie), background track.
- Toolchain: Playwright 1.61.1, FFmpeg (libx264), GSAP 3.15.0 (all pinned in `package.json`).

## What this skill does NOT do

- Does not list themes as text bullets (visualize, don't list).
- Does not activate connectors or publish; no network in the render path.
- Does not persist chain-of-thought, secrets, PII, or private locators.

## Check

`node skills/content-os-changelog-video/scripts/check-skill.mjs` — verifies required
files, pinned deps, contract tokens, forbidden APIs absent, negative fixture documents
violations.
