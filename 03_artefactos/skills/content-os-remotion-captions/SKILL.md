---
name: content-os-remotion-captions
description: This skill should be used when the user asks to "add captions in Remotion", "Remotion subtitles", "Remotion @remotion/captions", "transcribe + animate captions", "Remotion Caption type", or "Remotion SRT / VTT captions". Transcribe, display and animate captions in Remotion: the `Caption` type from `@remotion/captions`, JSON-driven caption tracks, frame-driven timing/animation, no CSS transition. Sits beside `remotion-video-production` (MetodologIA canonical). Clean-room prose from the Remotion publisher reference (source-available, Remotion AG). Output stays RENDERED_DRAFT; production gates G13-G17 manual. Unclear → content-os-remotion-best-practices.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires exact H-03 toolchain pins (Remotion 4.0.494, React 19) and a reviewed caption-track from content-os-transcript-intelligence. Sits beside `remotion-video-production`. Captions are markup; scaffold via `content-os-remotion-create`, render via `content-os-remotion-render`. No runtime dependency added.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Remotion Captions — transcribe, display, animate

Derivada de `remotion-captions` (`remotion/remotion-publisher`, source-available
Remotion AG). Locally-authored clean-room prose adaptation for the Frames ContentOS
toolchain. Vendor reference: `skills/vendor/remotion-publisher/remotion-captions/SKILL.md`
(read-only). Sits beside `remotion-video-production` (MetodologIA canonical).

This skill handles the caption data model + frame-driven display. It does not scaffold
the project (`content-os-remotion-create`) or render (`content-os-remotion-render`).

## Caption data model

All captions must originate in `caption-track.json` from
`content-os-transcript-intelligence`, then be adapted off-render to the `Caption` type
from `@remotion/captions`
(see `skills/vendor/remotion-publisher/remotion-captions/SKILL.md`, read-only). A caption
track is a list of entries with timing (`startMs`/`endMs`) and text. Direct ASR, SRT or
VTT is not authoritative; the render path reads only reviewed JSON.

Never parse SRT/VTT live in the render path. Convert SRT/VTT → `Caption` JSON off-render
(deterministic), then drive the composition from the JSON.

## Frame-driven display

Drive caption visibility with `useCurrentFrame()` + `interpolate()`:

- Convert `startMs`/`endMs` → frames (`ms * fps / 1000`).
- Show a caption when `frame` is within its frame range; `Sequence from={startFrame}
durationInFrames={lenFrame}` is the clean primitive.
- Animate in/out (fade, slide) via `interpolate(frame, [inStart, inEnd], [0, 1])`; clamp;
  never CSS `transition` / `animation`.
- Word-by-word or karaoke highlight: `interpolate` on the per-word reveal frame; deterministic.

No `Math.random`, `Date.now`, `new Date`, `fetch`, `setTimeout`, `setInterval` in the
render path. Same caption JSON + frame ⇒ same pixels.

## Determinism contract

Transcription is off-render and deterministic (same audio ⇒ same `Caption` JSON via the
same model/version). The render path is pure: JSON + frame ⇒ pixels. A render is
`RENDERED_DRAFT`; production gates G13-G17 manual.

## Remote / transcription API

A live transcription API call in the render path is forbidden. Transcribe off-render,
persist the `Caption` JSON as a first-party version-pinned asset, load via `delayRender`.
Remote transcription is opt-in auth-gated fail-closed and runs only off-render.

## Preflight

1. Confirm exact toolchain pins (Remotion 4.0.494, React 19).
2. Confirm the Remotion license verdict (`H03-LIC-REMOTION-001.yml`).
3. Confirm `caption_policy_ref`, `transcript_intelligence_ref` and the reviewed
   caption JSON are first-party version-pinned.
4. Stop on: live transcribe/SRT-parse in render path, network in render path, unpinned
   assets, production request without human gate approval.

## Stop rules

Reject `Math.random`, `Date.now`, `new Date`, `fetch`, `setTimeout`, `setInterval`,
live SRT/VTT parse in render path, live transcription API in render path, CSS
`transition`/`animation` for caption timing, unpinned remote assets, and production /
publish requests. Remotion stays `local_evaluation` until the license verdict and G13-G17
gates resolve.

## Verificación

```bash
node skills/content-os-remotion-captions/scripts/check-skill.mjs
pnpm typecheck
pnpm verify:skills
```

Conservar `remotion-video-production`, VS-001, H-01, H-02, n8n y `Root.tsx`
byte-idénticos.

## Referencias

- `skills/remotion-video-production/SKILL.md` — MetodologIA canonical Remotion skill (authority sibling).
- `skills/vendor/remotion-publisher/remotion-captions/SKILL.md` — vendor reference (read-only, source-available Remotion AG).
- `receipts/dependency-audits/H03-LIC-REMOTION-001.yml` — Remotion license verdict + source-available-publisher addendum.
