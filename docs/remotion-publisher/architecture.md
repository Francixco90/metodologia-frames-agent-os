# Remotion publisher → Frames ContentOS architecture mapping

> Reference for Frames ContentOS Fase 2B. Maps the vendored Remotion publisher skills
> (`skills/vendor/remotion-publisher/`) onto the MetodologIA `content-os-remotion-*`
> homólogos. Source-available reference; homólogos are clean-room prose.

## Remotion publisher model (as vendored)

11 skills from `remotion-dev/skills` (standalone install target) at
`f94c1e18db2bb30b904784b986f6897822b8f152`:

- `remotion-best-practices` — umbrella skill encompassing all others (134 source files,
  nested duplicate copies of every other skill; 122 vendored text files).
- `remotion-create` — project scaffold (`npx create video`).
- `remotion-markup` — composition structure, images, video embedding, text measuring.
- `remotion-maps` — geo maps (maptiler + cesium techniques; `.tsx` reference code).
- `remotion-render` — render pipeline (`npx remotion render`).
- `remotion-captions` — transcription + SRT import + display.
- `remotion-saas` — programmatic SaaS rendering at scale.
- `remotion-interactivity` — interactive player + browser interactions.
- `remotion-docs` — docs navigation reference.
- `remotion-upgrade` — version upgrade guidance.
- `remotion-multimedia` — audio/video media handling.

The skills are **markdown reference** (SKILL.md + rules/*.md). The `.tsx/.ts/.mjs` code
in `remotion-maps` (maptiler/cesium techniques) is reference implementation that imports
the Remotion runtime — vendored as text, NOT executed.

## Frames ContentOS paradigm

The repo already pins **Remotion 4.0.494** in the toolchain and has 2 registered
Remotion skills: `remotion-video-production` (v1, Fase 4 hardening) and
`motion-library-adapters` (v0.2.0). The `content-os-remotion-bridge` (Fase 4) provides
bidirectional R↔H interop. Fase 2B adds **`content-os-remotion-*` homólogos** derived
(clean-room) from the vendored publisher skills.

## Capability mapping (vendored → Frames ContentOS homólogo, Fase 2B)

| vendored skill            | Frames ContentOS homólogo (Fase 2B)  | type                                                                               |
| ------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------- |
| `remotion-best-practices` | `content-os-remotion-best-practices` | build (umbrella, principal; cite `remotion-video-production-v2` authority sibling) |
| `remotion-create`         | `content-os-remotion-create`         | build (scaffold reference; auth-gated, offline-fallback)                           |
| `remotion-markup`         | `content-os-remotion-markup`         | build (composition structure, images/video, text measuring)                        |
| `remotion-maps`           | `content-os-remotion-maps`           | build (geo maps; .tsx reference inert — adapt locally)                             |
| `remotion-render`         | `content-os-remotion-render`         | build (render pipeline; reuse toolchain Remotion 4.0.494)                          |
| `remotion-captions`       | `content-os-remotion-captions`       | build (transcription + SRT; coordinate with content-os-embedded-captions)          |
| `remotion-saas`           | `content-os-remotion-saas`           | build (programmatic SaaS; auth-gated)                                              |
| `remotion-interactivity`  | `content-os-remotion-interactivity`  | build (interactive player)                                                         |
| `remotion-docs`           | `content-os-remotion-docs`           | build (docs index)                                                                 |
| `remotion-upgrade`        | `content-os-remotion-upgrade`        | build (upgrade guidance)                                                           |
| `remotion-multimedia`     | `content-os-remotion-multimedia`     | build (media handling; dep `content-os-media`)                                     |

## License guard (critical)

- Vendored skills are **source-available** (Remotion AG two-tier, NOT OSI). No
  redistribution or relicensing rights.
- Homólogos are **clean-room prose**: `LINEAGE.yml`
  `content_license: LicenseRef-MetodologIA-Internal` +
  `derivation_mode: clean-room-prose-from-source-available-reference`.
- `check-skill.mjs` per homólogo is self-contained — **no import of vendor code**.
- `runtime-boundary.yml` declares no new Remotion runtime dep (4.0.494 already
  toolchain-pinned). No `package.json` mutation expected.
- `authority_refs` in each homólogo → vendor path read-only reference.

## Determinism contract

Remotion is frame-driven (frame clock, offline). Frames ContentOS inherits: no `Date.now()` /
`Math.random()` in composition code, no network in render path, fail-closed remote
adapters, hash-bound homólogos (4 lifecycle events, append-only).

## What Fase 1B does NOT do

- Does not register vendored skills in any registry (vendors bypass `verify:skills`).
- Does not add a runtime dep (no `package.json` mutation; Remotion 4.0.494 already pinned).
- Does not build, type-check, lint or execute vendor files.
- Does not create any `content-os-remotion-*` native skill (Fase 2B homólogos, separate PRs).

## Fase 2B inputs (from this audit)

- This mapping + the clean-room derivation mode.
- `receipts/dependency-audits/H03-LIC-REMOTION-001.yml` addendum (source-available
  publisher, extended in this PR).
- 4 PRs batched 3 (Core / Render+media / Captions+interactivity+saas / Docs+upgrade).
