---
name: content-os-remotion-best-practices
description: This skill should be used when the user asks to "make a Remotion video", "create a new Remotion composition", "Remotion best practices", "which Remotion skill do I need", "Remotion project setup", or "Remotion React markup rules". The umbrella router for the Frames ContentOS Remotion family — routes a Remotion authoring request to the right sibling skill (create a project, write React markup, render, captions, interactivity, maps, multimedia, saas, docs, upgrade). Sits beside `remotion-video-production` (the MetodologIA canonical Remotion skill). Clean-room prose from the Remotion publisher reference (source-available, Remotion AG). Production gates G13-G17 manual; `local_evaluation` only. Unclear → content-os-router.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires exact H-03 toolchain pins (Remotion 4.0.494, React 19, Node, pnpm, FFmpeg, Playwright). Sits beside `remotion-video-production` (authority sibling). Routes to `content-os-remotion-create`, `content-os-remotion-markup`, and the wider `content-os-remotion-*` family. No runtime dependency added.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Remotion Best Practices — the router

Derivada de `remotion-best-practices` (`remotion/remotion-publisher`, source-available
Remotion AG). Locally-authored clean-room prose adaptation for the Frames ContentOS
toolchain. Vendor reference: `skills/vendor/remotion-publisher/remotion-best-practices/SKILL.md`
(read-only). Sits beside `remotion-video-production` (MetodologIA canonical).

This skill is the umbrella router for Remotion authoring. It does not write markup or
render itself — it routes to the right sibling and enforces the non-negotiable rules that
span every Remotion composition.

## Routing

| user intent                                                               | route to                                                                    |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Make / create / build a new video or composition; new project scaffold    | `content-os-remotion-create`                                                |
| Write Remotion React markup; content / animation / effects best practices | `content-os-remotion-markup`                                                |
| Render a composition to MP4; render settings / codec / concurrency        | `content-os-remotion-render` (Fase 2B batch 2)                              |
| Captions / subtitles                                                      | `content-os-remotion-captions` (Fase 2B batch 3)                            |
| Interactive / player / input-driven                                       | `content-os-remotion-interactivity` (Fase 2B batch 3)                       |
| Data-driven maps (geo / data viz)                                         | `content-os-remotion-maps` (Fase 2B batch 2)                                |
| Audio / embedded video / multimedia                                       | `content-os-remotion-multimedia` (Fase 2B batch 2)                          |
| SaaS / cloud rendering / auth                                             | `content-os-remotion-saas` (Fase 2B batch 3)                                |
| Docs / upgrade / migration                                                | `content-os-remotion-docs`, `content-os-remotion-upgrade` (Fase 2B batch 4) |
| Ambiguous or multi-intent                                                 | stay here, enumerate options, ask                                           |

If the request maps cleanly to one sibling, route immediately and do not duplicate the
sibling's guidance here.

## Non-negotiable rules (span every Remotion composition)

1. **Drive animation with `useCurrentFrame()` and `interpolate()`** — never CSS
   `transition` or `animation`; never Tailwind animation classes. They do not render
   frame-accurately and must be refactored to frame-driven tweens.
2. **Use `Easing.bezier()` and `Easing.spring()`** for timing curves — never linear
   unless explicitly intended.
3. **Determinism is the contract**: no `Math.random`, `Date.now`, `new Date`, `fetch`,
   `setTimeout`, `setInterval` in the render path. The same input + frame ⇒ the same
   pixel output.
4. **Composition = `{fps, durationInFrames, width, height}`** fixed at register time;
   `calculateMetadata` for dynamic dimensions; `defaultProps` for every prop.
5. **Register with `registerRoot`** exactly once; one `Root.tsx` per project.
6. **Offline render profile**: no network in the render path; assets first-party and
   version-pinned; remote media is opt-in auth-gated and fail-closed.
7. **Render state is `RENDERED_DRAFT`** — a successful render never grants
   `HUMAN_APPROVED`, `READY`, or `PUBLISHED`. Production gates G13-G17 are manual.

## Preflight

1. Confirm exact toolchain pins (Remotion 4.0.494, React 19, Node, pnpm, FFmpeg).
2. Confirm the Remotion license verdict for the target use case (Free License vs
   Company License) — see `receipts/dependency-audits/H03-LIC-REMOTION-001.yml`.
3. Route to the sibling that owns the concrete work.
4. Stop on: network in render path, unpinned assets, ambiguous license, or a
   production request without human gate approval.

## Stop rules

Reject `Math.random`, `Date.now`, `new Date`, `fetch`, `setTimeout`, `setInterval`,
CSS `transition`/`animation`, Tailwind animation classes, network in render, unpinned
assets, and production / publish requests. Remotion stays `local_evaluation` until the
license verdict and G13-G17 gates resolve.

## Verificación

```bash
node skills/content-os-remotion-best-practices/scripts/check-skill.mjs
pnpm typecheck
pnpm verify:skills
```

Conservar `remotion-video-production`, VS-001, H-01, H-02, n8n y `Root.tsx`
byte-idénticos.

## Referencias

- `skills/remotion-video-production/SKILL.md` — MetodologIA canonical Remotion skill (authority sibling).
- `skills/vendor/remotion-publisher/remotion-best-practices/SKILL.md` — vendor reference (read-only, source-available Remotion AG).
- `receipts/dependency-audits/H03-LIC-REMOTION-001.yml` — Remotion license verdict + source-available-publisher addendum.
