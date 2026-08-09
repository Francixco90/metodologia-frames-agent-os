---
name: content-os-remotion-create
description: This skill should be used when the user asks to "create a new Remotion video", "scaffold a Remotion project", "new Remotion composition", "set up a Remotion project", "register a composition", or "make a Remotion video from scratch". Scaffold a new Remotion project and author the first composition: project init, Root.tsx + registerRoot, composition registration with {fps, durationInFrames, width, height}, defaultProps, calculateMetadata. Sits beside `remotion-video-production` (MetodologIA canonical). Clean-room prose from the Remotion publisher reference (source-available, Remotion AG). Output stays RENDERED_DRAFT; production gates G13-G17 manual. Unclear → content-os-remotion-best-practices.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires exact H-03 toolchain pins (Remotion 4.0.494, React 19, Node, pnpm, FFmpeg). Sits beside `remotion-video-production`. No runtime dependency added.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Remotion Create — scaffold a project + composition

Derivada de `remotion-create` (`remotion/remotion-publisher`, source-available
Remotion AG). Locally-authored clean-room prose adaptation for the Frames ContentOS
toolchain. Vendor reference: `skills/vendor/remotion-publisher/remotion-create/SKILL.md`
(read-only). Sits beside `remotion-video-production` (MetodologIA canonical).

This skill creates a new Remotion project and authors the first composition. It does
not write the React markup body (that is `content-os-remotion-markup`) or render
(that is `content-os-remotion-render`).

## Scaffold a project

If a project already exists, skip scaffolding. Otherwise:

1. Confirm Node, pnpm and Git installed and the folder is appropriate for a new project.
2. Scaffold a blank project (no tailwind starter) — the Frames ContentOS toolchain pins
   exact versions and adds its own structure.
3. Install with the exact toolchain pins (Remotion 4.0.494, React 19); never `latest`.
4. Confirm `Root.tsx` exists and is the single `registerRoot` entry point.

Do NOT pull a starter that bundles network fetch, analytics, or unpinned deps.

## Register a composition

Every composition declares a fixed contract at register time:

- `id` — stable, unique, `^[a-z0-9-]+$`.
- `component` — the React component rendered per frame.
- `durationInFrames` — integer ≥ 1; the composition length in frames.
- `fps` — integer; the frame rate (e.g. 30, 60).
- `width`, `height` — integer pixels; fixed unless `calculateMetadata` is used.
- `defaultProps` — every prop the component reads; no prop without a default.

For dynamic dimensions or metadata derived from input, implement `calculateMetadata`:
a pure function of props ⇒ `{durationInFrames, fps, width, height, ...}`. It must be
deterministic — no `Math.random`, `Date.now`, `new Date`, `fetch`, `setTimeout`,
`setInterval`. Same props ⇒ same metadata, always.

Register exactly one `Root.tsx` per project with `registerRoot(<Composition .../>)`.

## Non-negotiable rules

1. Animation is `useCurrentFrame()` + `interpolate()`; never CSS `transition` /
   `animation`; never Tailwind animation classes.
2. `Easing.bezier()` and `Easing.spring()` for curves.
3. Determinism: same input + frame ⇒ same pixel output. No temporal/network APIs in
   the render path or `calculateMetadata`.
4. One `registerRoot`; one `Root.tsx`; every prop has a `defaultProps` entry.
5. Offline render profile; assets first-party and version-pinned; remote media opt-in
   auth-gated and fail-closed.
6. Render state is `RENDERED_DRAFT` — never `HUMAN_APPROVED`, `READY`, `PUBLISHED`
   from a render alone. Production gates G13-G17 manual.

## Preflight

1. Complete `DocumentationImpactPlanV1` before the first scaffold or composition mutation;
   every surface is `REQUIRED` or `NOT_APPLICABLE` with a reason code.
2. Confirm exact toolchain pins.
3. Confirm the Remotion license verdict (`H03-LIC-REMOTION-001.yml`).
4. If the request is "write markup", route to `content-os-remotion-markup`.
5. Stop on: network in render path, unpinned assets, ambiguous license, production
   request without human gate approval.

## Transversal documentation closure

After freezing the candidate, synchronize every required documentation surface and obtain
a hash-bound `DocumentationClosureReceiptV1` with PASS. Do not claim the creation done
until RT-09 grants `DOCS_TRANSVERSAL_COMPLETE`. Any later change invalidates the receipt
and opens a successor; this gate grants neither production nor publication.

## Stop rules

Reject `Math.random`, `Date.now`, `new Date`, `fetch`, `setTimeout`, `setInterval`,
CSS `transition`/`animation`, Tailwind animation classes, `latest` versions, network
in render, unpinned assets, and production / publish requests.

## Verificación

```bash
node skills/content-os-remotion-create/scripts/check-skill.mjs
pnpm typecheck
pnpm verify:skills
```

Conservar `remotion-video-production`, VS-001, H-01, H-02, n8n y `Root.tsx`
byte-idénticos.

## Referencias

- `skills/remotion-video-production/SKILL.md` — MetodologIA canonical Remotion skill (authority sibling).
- `skills/vendor/remotion-publisher/remotion-create/SKILL.md` — vendor reference (read-only, source-available Remotion AG).
- `receipts/dependency-audits/H03-LIC-REMOTION-001.yml` — Remotion license verdict + source-available-publisher addendum.
