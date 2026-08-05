---
name: content-os-music-to-video
description: This skill should be used when the user asks to "make a lyric video", "turn a music track into a video", "beat-synced video from audio", "kinetic promo from a song", "cut a slideshow to the beat", or "generate a video from a mood brief and music". Turns a music track (audio file, video to pull audio from, or track generated from a mood brief) into a beat-synced video — lyric video, slideshow, or kinetic promo. The music drives all pacing; any user-supplied images/videos are cut onto the same beat grid, and a complete video needs zero assets. Narrated pieces → the input-matched workflow (content-os-router). Unclear → content-os-router.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Orchestrates content-os-core (HTML composition + Playwright/FFmpeg render adapter), content-os-media (beat analysis, audio extraction, transcription, track generation), content-os-animation (GSAP motion primitives, transitions). Input = music track + optional user media. Pacing = beat grid (rhythmic) or phrase (calm). Output RENDERED_DRAFT (renders/video.mp4, beat-synced frames + bgm.mp3 audio).
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# music-to-video — one music-grounded, beat-synced video workflow

Derivada de `music-to-video` (`heygen-com/hyperframes`, Apache-2.0). Locally-authored
adaptation for the Frames ContentOS toolchain (HTML composition → Playwright render → MP4).
Vendor reference: `skills/vendor/hyperframes/music-to-video/SKILL.md` (read-only).

## What this skill does

Turn a **music track** into a beat-synced Frames ContentOS video. You analyze the track once,
lay out the frames, fill in a per-frame plan, and build each frame as a composition. The
input is a music track plus optional user images or videos — there is **no narration and
no website capture**. Typography and templates are the floor (a complete video needs zero
assets); any media the user supplies is cut in on the same beat grid.

You are the **orchestrator**. Work in `videos/<project>/`. Run the steps in order and pass
each **Gate** before moving on. Two steps need the user: **Step 3** (plan approval) and
**Step 6** (render approval). In autonomous mode, post the summary as a heads-up and
proceed instead of waiting.

`SKILL_DIR` = this skill directory. `PROJECT_DIR` = `videos/<project-name>/`.

## Two ideas that shape everything

- **One analyzer, and you trust it.** The beat analyzer (via `content-os-media`) is the
  only beat analyzer — never re-measure beats with another tool or by ear. Its energy /
  density / rolls / onsets / silences are always reliable. Its `bpm` and `beats_sec` are
  reliable **only when the music is genuinely rhythmic**; on calm music the grid is a
  metronome the tracker imposed, so pace by phrases and energy instead and never hard-cut
  to it.
- **One frame = one file; groups live inside.** The track is cut into **frames**, and each
  frame becomes one composition file `compositions/frames/NN-<frame_id>.html`. A frame can
  subdivide into **groups** (each a template or a motion-primitives combo). Extra density
  goes _inside_ a group, so **frame count tracks distinct treatments, not beats** — a fast
  track does not blow up the number of frames.

## Pipeline

Step 0 setup → `project.json` + `assets/bgm.mp3`.
Step 1 analyze → `audiomap.json` (beat grid, energy, density, onsets, silences).
Step 2 skeleton → `STORYBOARD.md` (frames, groups `TBD`).
Step 3 plan → complete `STORYBOARD.md` + `frame.md` (user gate).
Step 4 build → `compositions/frames/NN-*.html` (one per frame).
Step 5 assemble → `index.html`.
Step 6 render → `renders/video.mp4` (user gate).

### Step 0 — setup, BGM, inputs

The **music is the spine** — establish one track before anything else. This skill is tuned
for **fast, high-energy BGM**: a strong beat grid drives the cuts (calm tracks work, but
pace by phrase rather than beat). If the user supplied audio, use it. Otherwise choose the
mood from the request and generate a track through `content-os-media` (local provider;
remote opt-in, fail-closed). The resulting track lands at `assets/bgm.mp3`. Stage supplied
images or videos so frames can use them on the beat grid; otherwise typography carries the
video.

**Lyric videos:** for lyrics synced to the vocals, get word/line timing by transcribing the
track via `content-os-media`, or ask the user for the lyrics text and place lines on the
beat grid.

### Step 1 — analyze beatgrid

Run the beat analyzer on `assets/bgm.mp3`. Write `audiomap.json`: `bpm`, `beats_sec`,
`energy` (per-frame envelope), `density`, `rolls`, `onsets`, `silences`. Trust this output.
If the music is calm, mark `pacing: phrase` for the frames; if rhythmic, `pacing: beat`.

### Step 2 — skeleton

Cut the track into **frames** from the audiomap. Each frame = one distinct visual
treatment. Write `STORYBOARD.md` with the frame list and `groups: TBD` placeholders. Frame
count tracks distinct treatments, not beats.

### Step 3 — plan (user gate)

Complete `STORYBOARD.md`: assign each frame a template or motion-primitives combo, fill
the groups, decide typography/media per frame. Write `frame.md` (the per-frame plan). Post
the summary as a heads-up; wait for approval in interactive mode, proceed in autonomous.

### Step 4 — build frames

For each frame, write `compositions/frames/NN-<frame_id>.html`. Each composition uses GSAP
timelines (`gsap.timeline`, `paused: true`) keyed to the Frames ContentOS clock contract
(`window.__timelines`, `data-start`, `data-duration`). No `Math.random`, no `Date.now`, no
`fetch`, no `setTimeout`, no `setInterval` in any frame (determinism contract).

### Step 5 — assemble

Assemble `index.html`: every frame composition sequenced on the master timeline. The
composition declares `data-composition-id`, `data-duration` (track duration), and the
timeline clock. `assets/bgm.mp3` is the audio track (muxed at render).

### Step 6 — render (user gate)

Render `index.html` to `renders/video.mp4` via the Frames ContentOS render adapter
(`content-os-core/scripts/render-html.ts`): Playwright + FFmpeg (`libx264`, `image2pipe`),
frame clock deterministic, no network in the render path. Mux `assets/bgm.mp3` as audio.

## Determinism contract (inherited from content-os-core)

- No `Math.random()` / `Date.now()` / `new Date()` / `fetch()` / `setTimeout()` /
  `setInterval()` in any frame or composition code.
- GSAP timelines `paused: true`, driven by the Frames ContentOS frame clock.
- No network in the render path. Remote media adapters fail-closed (`content-os-media`).
- `RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED`.

## Dependencies

- `content-os-core` — HTML composition contract + Playwright render adapter.
- `content-os-media` — beat analysis, audio extraction, transcription, track generation.
- `content-os-animation` — GSAP motion primitives, transitions.
- Toolchain: Playwright 1.61.1, FFmpeg (libx264), GSAP 3.15.0 (all pinned in `package.json`).

## What this skill does NOT do

- Does not handle narration (use the input-matched creation workflows).
- Does not capture websites (use `content-os-product-launch-video`).
- Does not activate connectors or publish; no network in the render path.
- Does not persist chain-of-thought, secrets, PII, or private locators.

## Check

`node skills/content-os-music-to-video/scripts/check-skill.mjs` — verifies required files,
pinned deps, contract tokens, forbidden APIs absent, negative fixture documents violations.
