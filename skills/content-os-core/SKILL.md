---
name: content-os-core
description: This skill should be used when the user asks to "render video from HTML", "build a Frames ContentOS composition", "validate an HTML+GSAP seekable timeline", "run the Playwright HTML to MP4 adapter", or "define the dual paradigm HTML runtime contract".
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires Playwright 1.61.1, FFmpeg 8.1.1, GSAP 3.15.0 and an offline render profile. No network on the render path.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Frames ContentOS Core

El contrato técnico del runtime **HTML+GSAP** de Frames ContentOS. Una composición es
un archivo HTML cuyo DOM declara timing con atributos `data-*`, cuya animación es
seekable (GSAP `paused: true`, scrub a frame `t`), y cuya reproducción de media es
framework-owned. El render adapter local HTML→MP4 drviea Playwright por frame time,
screenshot, pipe a FFmpeg. Adaptado de `hyperframes-core` (vendor, referencia) al
arquitectura local fail-closed + hash-bound + offline-first. No reemplaza Remotion;
coexisten (dual paradigm, ver `docs/content-os/architecture.md`).

## Preflight

1. Validar `schemas/html-composition-v1.schema.json` (composition_id, width, height,
   duration, fps, clips, tracks).
2. Exigir `{compositionId, width, height, fps, durationInFrames}` explícito.
3. Confirmar Playwright 1.61.1 + FFmpeg 8.1.1 + GSAP 3.15.0 pinned (toolchain).
4. Detener ante red, reloj, aleatoriedad implícita, asset externo o licencia
   insuficiente.

## Composition contract

### Root

- `<div data-composition-id="…" data-width="…" data-height="…"
data-duration="…" data-start="0">` sized box (`width`/`height` en px). Root debe
  llevar `data-start="0"`.
- Un standalone `index.html` pone el root directo en `<body>` (sin `<template>`).
- Una sub-composición carga via `data-composition-src` y envuelve el root en
  `<template>`.

### One paused timeline

- Cada composición registra exactamente un `gsap.timeline({paused: true})` en
  `window.__timelines["<compositionId>"]`, built síncrono al load.
- Render duration = root `data-duration`, no timeline length.
- El adapter scrubs: `window.__timelines["<id>"].seek(frame / fps)`.

### Clips

- `class="clip"` con `data-start`, `data-duration`, `data-track-index`. El framework
  controla visibilidad `.clip`.
- Mismo track: no overlapping a menos que sea intencional (`data-track-index`
  separa).
- IDs únicos en la página ensamblada. Sub-composiciones prefijan
  `#<compositionId>-<id>`.

### Media (framework-owned)

- `<video>`/`<audio>` a cualquier profundidad. El adapter pausa y seeka media al
  frame `t` determinísticamente (no wall-clock playback).
- Media local (file://) o data: URI. Sin URLs remotas en render path default.

## Render adapter — HTML→MP4

Vive en `scripts/render-html.ts`. Contrato:

- **Input**: compositionPath (HTML file), compositionId, width, height, fps,
  durationInFrames, outputMp4.
- **Por frame `t` in [0, durationInFrames)**: `chromium.launch` headless →
  `page.goto(file://composition)` → `page.evaluate(scrub timeline a t/fps)` →
  `page.screenshot(png)`. Pipe frames a FFmpeg `image2pipe` → `libx264` → MP4.
- **Determinism**: doble-capture del frame 0; si `sha256` difiere, abort
  (`COS-NONDETERMINISTIC`).
- **Offline**: hook `page.on('request')` rechaza todo URL no `file:`/`data:`
  (`COS-NETWORK-FORBIDDEN`).
- **No wall-clock**: el adapter no usa `Date.now()`/`Math.random()`/`new Date`.
  Timestamps del receipt vienen del composition spec (input), no del reloj.
- **Receipt**: JSON hash-bound (`schemaVersion`, `compositionId`, `frameCount`,
  `fps`, `browserVersion`, `ffmpegVersion`, `networkRequests: 0`,
  `deterministic: true`, `state: RENDERED_DRAFT`). No `READY`/`PUBLISHED` sin gates
  humanos G13-G17.

## Determinism rules

Heredadas de HyperFrames + fail-closed local:

- GSAP seekable (scrub a frame `t`, no wall-clock). Ticker apagado.
- Sin `Date.now()` / `Math.random()` / `new Date` en composition code.
- Sin `fetch` / `setTimeout` / `setInterval` en composition code.
- Sin network en render path default. Remote adapters error sin credenciales
  (fail-closed, no degradan).
- Animate solo visual-property allowlist. Nunca tween `display`/`visibility` raw.
- Sin `repeat: -1` (count finito). Sin CSS `transform` inicial que conflicte con
  GSAP tween (usar `gsap.fromTo`).
- Media playback framework-owned (start/stop determinístico por clip).

## Fail-closed + hash-bound

- Remote adapters (HeyGen TTS, OpenAI Whisper) error sin credenciales. Default
  offline.
- Cada skill `content-os-*` registrada con `content_sha256` +
  `package_manifest_sha256` + 4 lifecycle events append-only.
- `RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED`.
- n8n dry-run. No activar conectores ni publicar.

## Stop rules

Rechazar `fetch`, URLs remotas, timers, CSS animation autónomo, GSAP autónomo,
`Date.now`, `Math.random`, `new Date`, input-state, `repeat: -1`, perfil ANGLE
ausente (Three), y solicitud de producción. El adapter es `local_evaluation`;
producción requiere gates humanos.

## Verificación

```bash
node skills/content-os-core/scripts/check-skill.mjs
pnpm exec tsx skills/content-os-core/scripts/render-html.ts \
  --composition examples/minimal.html --composition-id cos-minimal \
  --width 1280 --height 720 --fps 30 --duration 300 \
  --output examples/minimal.mp4
pnpm typecheck
pnpm verify:skills
```

Conservar VS-001, H-01, H-02, n8n y Remotion skills byte-idénticos.
