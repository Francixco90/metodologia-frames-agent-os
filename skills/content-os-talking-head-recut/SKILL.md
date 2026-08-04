---
name: content-os-talking-head-recut
description: This skill should be used when the user asks to "add graphic overlays to a video", "dress up my talking-head clip", "package an interview with on-screen graphics", "add lower-thirds and data callouts", "layer designed cards on a playing video", or "recut a podcast clip with kinetic titles". Packages an existing talking-head / interview / podcast clip with timed, designed graphic overlay cards (titles, lower-thirds, data callouts, quotes, side panels, PiP) synced to the transcript on 16:9 / 9:16 / 4:5. The clip plays untouched; overlays are designed HTML rendered via the Content OS toolchain (Playwright + FFmpeg, GSAP). Not plain subtitles (content-os-embedded-captions). Unclear → content-os-router.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Orchestrates content-os-core (HTML composition + Playwright/FFmpeg render adapter), content-os-media (video probe, audio extraction, transcription), content-os-embedded-captions (sibling plain-subtitle track). Input = existing talking-head clip (plays untouched). Overlays = designed HTML cards synced to transcript. Output RENDERED_DRAFT (output.mp4, clip + overlay cards composited).
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Talking Head Recut — graphic overlay cards on a playing clip

Derivada de `talking-head-recut` (`heygen-com/hyperframes`, Apache-2.0). Locally-authored
adaptation for the Content OS toolchain (HTML composition → Playwright render → MP4).
Vendor reference: `skills/vendor/hyperframes/talking-head-recut/SKILL.md` (read-only).

## What this skill does

Takes a local video that **plays in full** and layers a sequence of timed, designed
**graphic cards** onto it — titles, lower-thirds, data callouts, quotes, side panels,
picture-in-picture — synced to what is being said. The clip plays untouched underneath.
There is no fixed archetype list and no prescribed card structure; the overlays emerge
from what the transcript actually says.

**Graphic-packaging sibling of `content-os-embedded-captions`.** Captions add the spoken
words as readable text; this skill adds designed graphics on top of the playing video.
Plain subtitles → `content-os-embedded-captions`. From-scratch video → the creation
workflows (`content-os-product-launch-video` / `content-os-faceless-explainer`).

## Front door

`content-os-router` owns intent routing. When the request lands here directly, confirm
only the input (which clip) and announce the render-strategy questions as deferred asks —
aspect, layout, style group, and card count stay at the plan step, where the probed
footage and transcript ground the recommendations. A `BRIEF.md`, when present, carries the
confirmed input and any user notes — read it first.

## Pipeline

Work in `videos/<project>/`. Inspectable intermediate files:

- `metadata.json` — duration / width / height / fps (probe via the media adapter)
- `audio.mp3` — extracted audio (FFmpeg)
- `transcript.json` — flat word array `[{ text, start, end }, …]` (Whisper via the media adapter; no `segments`, no `words` wrapper)
- `storyboard.json` — lightweight card outline (the agent's plan)
- `public/cards/card-XX.html` — one HTML fragment per card
- `public/index.html` — final assembled composition
- `output.mp4` — rendered video

### Step 0 — setup + probe

Establish the clip source. Probe the video (`ffprobe` via `content-os-media`) for duration,
dimensions, fps. Extract audio (`ffmpeg`). Transcribe the audio to a flat word array (Whisper
via `content-os-media`). Write `metadata.json`, `audio.mp3`, `transcript.json`.

### Step 1 — plan cards from the transcript

Read the transcript. Identify moments worth a graphic card: a named entity, a number, a
quote, a topic shift, a side reference. Each card has: `id`, `start`, `end`, `kind`
(title | lower-third | data-callout | quote | side-panel | pip), `content` (the text/HTML
payload), `rationale` (why here). Write `storyboard.json`. The card count tracks distinct
graphic moments, not transcript length — a dense 2-min clip may need 12 cards, a sparse
one 4.

### Step 2 — write each card's HTML

For each card in the storyboard, write a self-contained HTML fragment
(`public/cards/card-XX.html`). Each card is a positioned overlay: it composes over the
playing video, never replaces it. Cards use GSAP timelines (`gsap.timeline`, `paused: true`)
keyed to the Content OS clock contract (`window.__timelines`, `data-start`, `data-duration`).
No `Math.random`, no `Date.now`, no `fetch`, no `setTimeout`, no `setInterval` in any card
(determinism contract — see `content-os-core`).

### Step 3 — assemble the composition

Assemble `public/index.html`: a `<video>` element playing the source clip full-canvas, plus
every card fragment positioned absolutely above it. The composition declares
`data-composition-id`, `data-duration` (clip duration), and the timeline clock. Cards mount
at their `data-start` and play for their `data-duration`. The video plays once, untouched.

### Step 4 — render

Render `public/index.html` to `output.mp4` via the Content OS render adapter
(`content-os-core/scripts/render-html.ts`): Playwright launches Chromium, loads the
composition, drives the frame clock deterministically, captures frames to FFmpeg
(`libx264`, `image2pipe`). No network in the render path. The clip's own audio is muxed
back from `audio.mp3` (the visual track is silent; the original audio carries).

## Card archetypes (emergent, not fixed)

| kind         | when                                            | shape                                          |
| ------------ | ----------------------------------------------- | ---------------------------------------------- |
| title        | opening 0-3s, or a named section shift          | kinetic word-by-word reveal, brand font        |
| lower-third  | a speaker name/title appears                    | slide-in band, bottom-left, 2-3s hold          |
| data-callout | a number / stat / date is said                  | count-up or pop-in, large numeral, label below |
| quote        | a memorable line worth isolating                | full-card quote, 2-3s, then fade               |
| side-panel   | a reference / link / aside the speaker mentions | right-edge panel, persistent while relevant    |
| pip          | a second video angle / screenshot is referenced | inset rectangle, bottom-right, bordered        |

The list is descriptive, not prescriptive — new archetypes emerge from the transcript.

## Determinism contract (inherited from content-os-core)

- No `Math.random()` / `Date.now()` / `new Date()` / `fetch()` / `setTimeout()` /
  `setInterval()` in any card or composition code.
- GSAP timelines `paused: true`, driven by the Content OS frame clock.
- No network in the render path. Remote media adapters fail-closed (`content-os-media`).
- `RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED`.

## Dependencies

- `content-os-core` — HTML composition contract + Playwright render adapter.
- `content-os-media` — video probe, audio extraction, transcription (Whisper).
- `content-os-embedded-captions` — sibling (plain subtitle track, if also wanted).
- Toolchain: Playwright 1.61.1, FFmpeg (libx264), GSAP 3.15.0 (all pinned in `package.json`).

## What this skill does NOT do

- Does not edit the source clip (it plays untouched underneath).
- Does not generate plain subtitles (use `content-os-embedded-captions`).
- Does not build a video from scratch (use the creation workflows).
- Does not activate connectors or publish; no network in the render path.
- Does not persist chain-of-thought, secrets, PII, or private locators.

## Check

`node skills/content-os-talking-head-recut/scripts/check-skill.mjs` — verifies required
files, pinned deps, contract tokens, forbidden APIs absent, negative fixture documents
violations.
