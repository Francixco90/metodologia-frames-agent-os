# HyperFrames → Frames ContentOS architecture mapping

> Reference for Frames ContentOS Fases 1-4. Maps the vendored HyperFrames model
> (`skills/vendor/hyperframes/`) onto the MetodologIA fail-closed, hash-bound,
> offline-first architecture.
>
> **Inventario vendor (2026-08-04)**: 48 skills HyperFrames vendored
> (15 Fase 0 + 33 Fase 1A), Apache-2.0, reference-only. Ver
> `skills/vendor/hyperframes/README.md` para el inventario con hashes/lockfile. [DOC]

## HyperFrames model (as vendored)

HyperFrames renders video from HTML. A composition is an HTML file whose DOM
declares timing via `data-*` attributes, whose animation runtime is **seekable**
(GSAP scrubbed to an absolute frame time, not wall-clock), and whose media playback
is owned by the framework (deterministic start/stop per clip). Rendering = drive a
headless browser to each frame time, screenshot, pipe to FFmpeg `image2pipe`.

48 skills HyperFrames (15 Fase 0 + 33 Fase 1A). Fase 0: 7 capability layers + 8
deliverable workflows + 1 bridge. Fase 1A: 33 adicionales (ver
`skills/vendor/hyperframes/README.md` y §“Batch 2 (Fase 1A)” abajo).

## Frames ContentOS dual paradigm

| runtime                 | role                                           | determinism                          | use when                                                                   |
| ----------------------- | ---------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------- |
| **Remotion** (existing) | frame-driven React, governed source→video      | frame clock, offline                 | client-facing governed renders, data-viz, certificates                     |
| **HTML+GSAP** (new)     | seekable HTML compositions, creative workflows | seekable GSAP, framework-owned media | source→video workflows (PR/text/website→video), motion graphics, explainer |

The two coexist. `content-os-router` (Fase 2g) dispatches by intent; it does not
couple them. `content-os-remotion-bridge` (Fase 4) makes the interop explicit and
SSIM-graded.

## Runtime decision (proposed — Fase 1 finalizes)

HyperFrames renders HTML→MP4 via a headless browser engine. The project already
pins **Playwright 1.61.1** (used by the static-social carousel screenshot path).

- **Option A — vendor renderer source + thin Playwright adapter.** Copy the
  hyperframes render driver (from `packages/` upstream, not the skill text) behind
  `skills/vendor/hyperframes-renderer/`, wrap with a local adapter that reuses the
  pinned Playwright. No new npm runtime dep. Keeps fail-closed + dep-audit stable.
- **Option B — `@heygen/hyperframes` npm devDep.** Adds a runtime dep → mutates
  `package.json` → regen `RCP-DEP-PRODUCTION` receipt (cascade). Faster to adopt but
  surrenders offline-pinning to npm.

**Lean: Option A.** Reuses pinned Playwright, no dep-audit cascade, renderer source
is auditable and frozen. Fase 1 confirms after inspecting the upstream renderer
package surface.

## Media model (dual: offline default + remote opt-in)

| concern       | offline (default)                     | remote (opt-in, auth-gated)                      |
| ------------- | ------------------------------------- | ------------------------------------------------ |
| TTS           | Piper / Coqui local engines           | HeyGen TTS (via `media-use` adapter, auth-gated) |
| transcription | whisper.cpp local                     | OpenAI Whisper API (opt-in)                      |
| bg-removal    | ffmpeg local                          | remote providers (opt-in)                        |
| media resolve | local file + framework-owned playback | URL fetch (auth-gated, offline fallback)         |

`content-os-media` (Fase 2e) implements the resolve cascade. Remote adapters are
**fail-closed without credentials** (`npx … auth status` pattern); a project must
opt in explicitly. Default path is offline so determinism + fail-closed hold.

## Capability mapping (vendored → Frames ContentOS native)

| vendored skill            | Frames ContentOS native (Fase)        | type                                                                |
| ------------------------- | ------------------------------------- | ------------------------------------------------------------------- |
| `hyperframes`             | `content-os-router` (2g)              | build (extend Capa A router with source→video routes)               |
| `hyperframes-core`        | `content-os-core` (2a)                | build (HTML composition contract + Playwright render adapter)       |
| `hyperframes-animation`   | `content-os-animation` (2b)           | build (GSAP rules, offline, no random)                              |
| `hyperframes-creative`    | `content-os-creative` (2d)            | extend (delegate brand/voice/channel to `metodologia-brand-router`) |
| `hyperframes-keyframes`   | `content-os-keyframes` (2c)           | build (pose contract, lint/check/snapshot)                          |
| `hyperframes-registry`    | `content-os-registry` (2f)            | build (reusable HTML blocks, MetodologIA-shaped schema)             |
| `media-use`               | `content-os-media` (2e)               | build (dual offline + remote-opt-in)                                |
| `remotion-to-hyperframes` | `content-os-remotion-bridge` (4)      | build bidirectional (source is unidirectional Remotion→HTML)        |
| `slideshow`               | `content-os-slideshow` (3)            | build                                                               |
| `embedded-captions`       | `content-os-embedded-captions` (3)    | build                                                               |
| `pr-to-video`             | `content-os-pr-to-video` (3)          | build (auth-gated PR fetch + offline fallback)                      |
| `motion-graphics`         | `content-os-motion-graphics` (3)      | build                                                               |
| `product-launch-video`    | `content-os-product-launch-video` (3) | build                                                               |
| `faceless-explainer`      | `content-os-faceless-explainer` (3)   | build (priority — most useful for MetodologIA)                      |
| `general-video`           | `content-os-general-video` (3)        | build                                                               |

## Capability mapping — Batch 2 (Fase 1A)

33 additional vendored skills (Fase 1A, source commit range). Homólogo plan in
Fase 2A (batched 3 per PR); animation-adapter overlaps merge into existing
homólogos (no new), per plan risk #3. Batches 1-3 merged (PRs #35/#36/#37, 9
homólogos active); batches 4+ pending.

| vendored skill       | Frames ContentOS homólogo (Fase 2A)     | type                                                              |
| -------------------- | --------------------------------------- | ----------------------------------------------------------------- |
| `figma`              | `content-os-figma`                      | build (Figma design → frame reference, verify-motion inert)       |
| `hyperframes-cli`    | `content-os-hyperframes-cli` (meta/dev) | reference (deploy targets cloud/cloudrun/lambda inert; doc-index) |
| `music-to-video`     | `content-os-music-to-video`             | build (beatgrid→montage pipeline, motion-primitive catalog)       |
| `talking-head-recut` | `content-os-talking-head-recut`         | build (talking-head recut, frame/layout/style library)            |
| `captions-overlay`   | `content-os-captions-overlay`           | build (overlay caption model; coordinate with embedded-captions)  |
| `changelog-video`    | `content-os-changelog-video`            | build (changelog→video, lexicon + align-captions)                 |
| `cut-the-curve`      | `content-os-cut-the-curve`              | build (curve-cut transition + GSAP example)                       |
| `motion-doctrine`    | `content-os-motion-doctrine`            | build (seam-gate/seam-stamp doctrine; dep `content-os-animation`) |
| `oversized-cursor`   | `content-os-oversized-cursor`           | build (oversized cursor attention pattern)                        |
| `seam-craft`         | `content-os-seam-craft`                 | build (seam crafting between clips)                               |

Animation-adapter overlap (gsap, css-animations, tailwind, animejs, three, lottie,
waapi, typegpu, gsap-effects) — 9 skills.sh entries live in other repos and overlap
`motion-library-adapters` / `content-os-animation`. Decision: vendor as reference in
a later batch if needed + version-bump existing homólogos (no new), avoids
duplication. Hyperframes `contribute-catalog`, `hyperframes-read-first`,
`hyperframes-compose`, `claude-design-hyperframes`, `compose-video`, `hyperframes-tts`,
`website-to-video`, `marker-highlight`, `transitions`, `audio-reactive`,
`graphic-overlays`, `hyperframes-captions`, `captions` — listed on skills.sh but not
in the pinned repo at HEAD; separate source-repo research if user wants them
(follow-up, not blocking Fase 1A).

## Determinism contract (adapted)

HyperFrames determinism: seekable GSAP (scrub to frame `t`), framework-owned media
playback (no wall-clock), no `Date.now()`/`Math.random()` in composition code, no
network in render path. Frames ContentOS inherits this and adds:

- **fail-closed**: no remote in the default render path; remote adapters error
  without credentials rather than degrade.
- **hash-bound**: every native `content-os-*` skill is registered in
  `skill-registry.yml` / `creation-v3-skill-registry.yml` with `content_sha256` +
  `package_manifest_sha256` (4 lifecycle events, append-only).
- **offline-first media**: default engines local; remote is a per-project opt-in.
- **RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED**: workflow
  outputs stay `RENDERED_DRAFT` until the manual gates (G13-G17) clear.

## What Fase 0 does NOT do

- Does not register vendored skills in any registry (vendors bypass `verify:skills`).
- Does not add a runtime dep (no `package.json` mutation in Fase 0).
- Does not build, type-check, lint or execute vendor files.
- Does not create any `content-os-*` native skill (Fases 2-4).

## Fase 1 inputs (from this audit)

- This mapping + the runtime decision (Option A vs B).
- `docs/content-os/capability-matrix.md` (formalize the table above).
- `docs/content-os/architecture.md` (dual paradigm, media model, determinism).
- `docs/content-os/roadmap.md` (PR sequence for Fases 2-4, priority order).
