---
name: content-os-remotion-render
description: This skill should be used when the user asks to "render a Remotion video", "export a Remotion composition", "render to MP4", "Remotion render settings", "Remotion codec / concurrency", "render a still", or "transparent video in Remotion". Render a Remotion composition to MP4 (or still PNG, or transparent WebM): `npx remotion render` settings, codec, concurrency, image-format, quality, offthread rendering, determinism. Sits beside `remotion-video-production` (MetodologIA canonical). Clean-room prose from the Remotion publisher reference (source-available, Remotion AG). Output stays RENDERED_DRAFT; production gates G13-G17 manual. Unclear → content-os-remotion-best-practices.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires exact H-03 toolchain pins (Remotion 4.0.494, React 19, FFmpeg libx264). Sits beside `remotion-video-production`. Reads compositions authored via `content-os-remotion-create` / `content-os-remotion-markup`. No runtime dependency added.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Remotion Render — export a composition to MP4 / still / transparent

Derivada de `remotion-render` (`remotion/remotion-publisher`, source-available
Remotion AG). Locally-authored clean-room prose adaptation for the Frames ContentOS
toolchain. Vendor reference: `skills/vendor/remotion-publisher/remotion-render/SKILL.md`
(read-only). Sits beside `remotion-video-production` (MetodologIA canonical).

This skill renders an existing composition. It does not author markup
(`content-os-remotion-markup`) or scaffold a project (`content-os-remotion-create`).

## General rendering strategy

Render a composition to MP4:

```bash
npx remotion render <entry> <composition-id> out/video.mp4
```

Render a still to PNG:

```bash
npx remotion still <entry> <composition-id> out/frame.png
```

Full options: https://www.remotion.dev/docs/cli/render (vendor docs, read-only reference).

## Non-negotiable settings

1. **Codec** — H.264 (`libx264`) for MP4; VP9 for WebM; PNG sequence for lossless. Pin
   the codec per render; never rely on a default that can drift.
2. **Concurrency** — `--concurrency` explicit; default is the CPU count. A render is
   deterministic regardless of concurrency (same frames produced), but concurrency
   changes wall-clock only.
3. **Image format** — `--image-format=jpeg` (fast, lossy) or `png` (lossless, needed for
   transparency). PNG is required for transparent video.
4. **Quality** — `--quality` for JPEG (0-100); leave H.264 CRF at the toolchain default.
5. **Offthread rendering** — on by default; do not disable unless a composition relies on
   shared mutable state across frames (then fix the composition, not the renderer).
6. **Gl / headless** — `--gl=swiftshader` or `angle` for CI; never depend on a host GPU.

## Transparent video

Render a transparent WebM (VP8 alpha) or MOV (ProRes 4444) with `--codec=h264` is NOT
transparent; use `--codec=vp8` or `--image-format=png` with a composition that uses
`<TransparentVideo>` / alpha. See `skills/vendor/remotion-publisher/remotion-render/transparent-videos.md`
(read-only). Pin `--image-format=png` for the alpha pass.

## Determinism contract

A render is deterministic: same composition + props + frame ⇒ same pixel output, at any
concurrency. No `Math.random`, `Date.now`, `new Date`, `fetch`, `setTimeout`, `setInterval`
in the render path (enforced by `content-os-remotion-best-practices`). A render produces
`RENDERED_DRAFT` — never `HUMAN_APPROVED`, `READY`, or `PUBLISHED`.

## Remote media

Remote media in render path is opt-in auth-gated fail-closed. Local first-party
version-pinned assets by default. `--browser-executable` pinned to the toolchain Chromium.

## Preflight

1. Confirm exact toolchain pins (Remotion 4.0.494, React 19, FFmpeg libx264).
2. Confirm the Remotion license verdict for the target use case
   (see `receipts/dependency-audits/H03-LIC-REMOTION-001.yml`).
3. Confirm `Root.tsx` is the single `registerRoot` entry.
4. Stop on: network in render path, unpinned assets, ambiguous license, production
   request without human gate approval.

## Stop rules

Reject `Math.random`, `Date.now`, `new Date`, `fetch`, `setTimeout`, `setInterval`,
unpinned `--browser-executable`, unpinned remote assets, GPU-dependent output, and
production / publish requests. Remotion stays `local_evaluation` until the license verdict
and G13-G17 gates resolve.

## Verificación

```bash
node skills/content-os-remotion-render/scripts/check-skill.mjs
pnpm typecheck
pnpm verify:skills
```

Conservar `remotion-video-production`, VS-001, H-01, H-02, n8n y `Root.tsx`
byte-idénticos.

## Referencias

- `skills/remotion-video-production/SKILL.md` — MetodologIA canonical Remotion skill (authority sibling).
- `skills/vendor/remotion-publisher/remotion-render/SKILL.md` — vendor reference (read-only, source-available Remotion AG).
- `receipts/dependency-audits/H03-LIC-REMOTION-001.yml` — Remotion license verdict + source-available-publisher addendum.
