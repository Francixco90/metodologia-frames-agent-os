---
name: content-os-remotion-multimedia
description: This skill should be used when the user asks to "get audio duration in Remotion", "get video dimensions in Remotion", "get video duration in Remotion", "Mediabunny in Remotion", "Remotion audio / video metadata", or "Remotion multimedia duration". Reading audio/video metadata (duration, dimensions) deterministically off-render via Mediabunny, then driving frame-accurate composition from that metadata. Sits beside `remotion-video-production` (MetodologIA canonical). Clean-room prose from the Remotion publisher reference (source-available, Remotion AG). Output stays RENDERED_DRAFT; production gates G13-G17 manual. Unclear → content-os-remotion-best-practices.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires exact H-03 toolchain pins (Remotion 4.0.494, React 19). Sits beside `remotion-video-production`. Reads metadata off-render; markup via `content-os-remotion-markup`. No runtime dependency added.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Remotion Multimedia — read audio/video metadata off-render

Derivada de `remotion-multimedia` (`remotion/remotion-publisher`, source-available
Remotion AG). Locally-authored clean-room prose adaptation for the Frames ContentOS
toolchain. Vendor reference: `skills/vendor/remotion-publisher/remotion-multimedia/SKILL.md`
(read-only). Sits beside `remotion-video-production` (MetodologIA canonical).

Mediabunny is a multimedia library for dealing with audio and video in the browser. It is
used here for reading metadata (duration, dimensions) **off-render**, before the
composition runs, so the composition can be frame-accurate and deterministic.

## What this skill does

- Get the duration of an audio file in seconds.
- Get the width/height (dimensions) of a video file.
- Get the duration of a video file in seconds.

The metadata is read once, off-render, and passed into the composition as `defaultProps` /
`calculateMetadata` inputs. The render path then uses only frame-driven values.

## Off-render vs in-render

Read metadata **off-render** (in `calculateMetadata` or a pre-pass), never inside the
per-frame render path. A per-frame metadata read breaks determinism and is forbidden.

- `calculateMetadata` — pure function of props ⇒ `{durationInFrames, fps, width, height}`;
  may call Mediabunny here (deterministic, same input ⇒ same output).
- render path — only `useCurrentFrame()` + `interpolate()` + the precomputed metadata.

## Determinism contract

No `Math.random`, `Date.now`, `new Date`, `fetch`, `setTimeout`, `setInterval` in the
render path. Mediabunny metadata reads are deterministic (same file ⇒ same duration /
dimensions). Remote media opt-in auth-gated fail-closed; local first-party version-pinned
assets by default. A render is `RENDERED_DRAFT`; production gates G13-G17 manual.

## Audio duration

Read the audio duration off-render, convert to frames (`durationSeconds * fps`), and use
the result as the composition `durationInFrames` or as a `Sequence durationInFrames`. See
`skills/vendor/remotion-publisher/remotion-multimedia/get-audio-duration.md` (read-only).

## Video dimensions

Read the video width/height off-render, pass via `calculateMetadata` → `width`/`height`,
or use them to size an overlay. See
`skills/vendor/remotion-publisher/remotion-multimedia/get-video-dimensions.md` (read-only).

## Video duration

Read the video duration off-render, convert to frames, use as the `durationInFrames` of
the `<Video>` or its parent `<Sequence>`. See
`skills/vendor/remotion-publisher/remotion-multimedia/get-video-duration.md` (read-only).

## Preflight

1. Confirm exact toolchain pins (Remotion 4.0.494, React 19).
2. Confirm the Remotion license verdict (`H03-LIC-REMOTION-001.yml`).
3. Confirm assets are local first-party version-pinned or remote opt-in fail-closed.
4. Stop on: per-frame metadata read, network in render path, unpinned assets, production
   request without human gate approval.

## Stop rules

Reject `Math.random`, `Date.now`, `new Date`, `fetch`, `setTimeout`, `setInterval`,
per-frame Mediabunny reads in the render path, unpinned remote assets, and production /
publish requests. Remotion stays `local_evaluation` until the license verdict and G13-G17
gates resolve.

## Verificación

```bash
node skills/content-os-remotion-multimedia/scripts/check-skill.mjs
pnpm typecheck
pnpm verify:skills
```

Conservar `remotion-video-production`, VS-001, H-01, H-02, n8n y `Root.tsx`
byte-idénticos.

## Referencias

- `skills/remotion-video-production/SKILL.md` — MetodologIA canonical Remotion skill (authority sibling).
- `skills/vendor/remotion-publisher/remotion-multimedia/SKILL.md` — vendor reference (read-only, source-available Remotion AG).
- `receipts/dependency-audits/H03-LIC-REMOTION-001.yml` — Remotion license verdict + source-available-publisher addendum.
