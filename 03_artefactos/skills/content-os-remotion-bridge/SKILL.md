---
name: content-os-remotion-bridge
description: This skill should be used when translating an existing composition between the two Frames ContentOS paradigms — Remotion (React, frame-driven) and HTML+GSAP (seekable composition). Use ONLY on an explicit ask to port/convert/migrate/translate a composition from one paradigm to the other. A passing mention, reference-only code, or "make something like my Remotion video" is a fresh build (content-os-general-video). Unclear → content-os-router.
version: 0.2.0
lifecycle_state: active
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Frames ContentOS Remotion Bridge

> The front door is `content-os-router`. Use this skill **only** to translate an **existing** composition between the two Frames ContentOS paradigms: Remotion (React, frame-driven, offline-deterministic) and HTML+GSAP (seekable composition, `window.__timelines`, `paused: true`, `tl.seek(frame/fps)`). Authoring a **new** composition, re-creating from a non-paradigm source (After Effects, Framer Motion, plain CSS), a passing Remotion/HTML mention, or any uncertainty → read `content-os-router` first: the intent layer owns every route decision.

## Overview

Frames ContentOS runs **two coexisting runtimes**. This bridge is the **bidirectional** translation layer between them:

- **R→H** — port an existing Remotion (React) composition's source into an HTML+GSAP composition. Adapted from the vendor `remotion-to-hyperframes` skill (Apache-2.0, see LINEAGE). Most Remotion idioms map mechanically (~80%); the lossy 20% is guarded by a source lint + escape-hatch to the runtime interop pattern.
- **H→R** — port an existing HTML+GSAP composition's source into a Remotion composition. The **inverse** mapping, native to Frames ContentOS (the vendor explicitly declines this direction). Seek-driven GSAP tweens become `useCurrentFrame()` derivations; `data-start`/`data-duration` become `<Sequence>`; `data-*` props become `defaultProps`.

Both directions **preserve the determinism contract** of the target paradigm and produce `RENDERED_DRAFT` — never `READY`/`PUBLISHED` without human gates. Both are **offline-first**: the render path contains no network. Both are **hash-bound** via sha256 (registry + 4 lifecycle events).

## When to use

**Use this skill ONLY when the user explicitly asks to translate between paradigms.**

**Do NOT use this skill when:**

- (a) The user is authoring a **new** composition, even if they have a similar one in the other paradigm for A/B reference.
- (b) The user mentions Remotion or HTML+GSAP in passing without asking for migration.
- (c) The user shares source as reference material rather than asking for a translation.
- (d) The source is not a composition in either Frames ContentOS paradigm (After Effects `.aep`, Framer Motion, plain CSS animation) — there is no paradigm source to translate. Re-create natively via `content-os-general-video`, or decline.

When in doubt, default to authoring a native composition with `content-os-general-video` instead of translating.

## Direction contract

| Direction | Source                            | Target                            | Lint                                                                                       | Mapping                     |
| --------- | --------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------- |
| R→H       | Remotion `Root.tsx` + scenes      | HTML `index.html` + GSAP timeline | Remotion blockers (useState/useReducer/useEffect-deps/async-metadata/third-party-React-UI) | `references/api-map.md`     |
| H→R       | HTML `index.html` + GSAP timeline | Remotion `Root.tsx` + scenes      | HTML determinism (seek-safe, no forbidden API, no network, no state-driven motion)         | `references/inverse-map.md` |

If the source lint fires a **blocker**, the translation is refused — recommend the **runtime interop pattern** (see `references/escape-hatch.md`): bundle the source with its native runtime and let the other paradigm drive it frame-by-frame, rather than emitting silently-wrong output. Translating past a blocker is the `unapproved-interop` violation.

## Workflow (step-gated orchestrator: setup → lint → plan → translate → validate → finalize)

### Step 1: setup

Confirm direction (R→H or H→R). Gate inputs: source exists, provenance + rights + authority verified (no promotion without hashes/provenance per AGENTS.md), scope exact (translate this source, nothing more). Declare write-set. Offline-first.

### Step 2: lint

Run the direction-specific linter over the source. R→H: detect Remotion blockers (`useState`, `useReducer`, `useEffect`/`useLayoutEffect` with non-empty deps, async `calculateMetadata`, third-party React UI libraries) + warnings (`@remotion/lambda`, `delayRender`, `useCallback`, `useMemo`, custom hooks). H→R: detect HTML determinism violations (no `window.__timelines` registration, non-paused timeline, `Date.now()`/`Math.random()`/`new Date()`/`performance.now()`/`fetch`/`setTimeout`/`setInterval`, state-driven motion, network in render path).

If any **blocker** fires, **stop**. Read `references/escape-hatch.md` and surface the interop recommendation. Do not translate. Warnings don't stop — drop the construct in step 4 and note the gap in `TRANSLATION_NOTES.md`.

### Step 3: plan

Load the mapping reference (`api-map.md` for R→H, `inverse-map.md` for H→R). Identify which topic refs the source needs (timing, sequencing, media, transitions, fonts, parameters). Document anticipated gaps (volume ramps, custom presentations, font substitutions). Don't load every ref — load only what this source uses.

### Step 4: translate

Emit the target composition. R→H: `index.html` with root `<div id="stage" data-composition-id data-start="0" data-duration data-fps data-width data-height>` + `data-*` per scalar prop, flat scene divs with `data-start`/`data-duration`/`data-track-index`, inline `<style>`, one paused `gsap.timeline({paused: true})`, register `window.__timelines["<id>"] = tl`. H→R: `Root.tsx` with `<Composition id durationInFrames fps width height defaultProps>`, scenes as `<Sequence from durationInFrames>`, GSAP tweens → `interpolate(frame, [a,b], [x,y])` / `spring({frame, fps, config})` derivations from `useCurrentFrame()`, `data-*` → `defaultProps` + Zod schema.

Custom subcomponents inline as repeated markup (R→H) or pure prop-driven React components (H→R). Preserve the target paradigm's determinism contract exactly: offline-first, deterministic, seek-safe (R→H) or frame-driven (H→R). No network in the render path.

### Step 5: validate

Run the eval. R→H: render the Remotion baseline (`npx remotion render`) + the HTML translation (Frames ContentOS render adapter), SSIM-diff the two outputs. H→R: render the HTML original + the Remotion translation, SSIM-diff. Threshold: ~0.02 below the source's complexity tier baseline. If the diff fails, run the frame strip to see which frames diverged, re-read the relevant mapping ref, and re-translate.

Critical: both renders must use matching pixel format (`Config.setVideoImageFormat("png")` + `Config.setColorSpace("bt709")` for the Remotion side) — otherwise the diff measures encoder differences, not translation fidelity. Skipping the eval or proceeding below threshold is the `silent-divergence` violation — a translation that "looks right" but renders 0.05 ssim lower than the validated baseline is silently wrong.

### Step 6: finalize

Write `TRANSLATION_NOTES.md` next to the target output: every gap that didn't translate cleanly (volume ramps dropped, custom presentations approximated, fonts substituted, `@remotion/lambda`/`@remotion/cloudrun` deployment config dropped, third-party UI declined). Emit the hash-bound runtime-boundary receipt. Mark output `RENDERED_DRAFT` — never `READY`/`PUBLISHED` without the human gates (G15 H01, G17 publish).

## What this skill explicitly does NOT do

- **Translate React state machines** (R→H) or state-driven HTML motion (H→R). Compositions that drive animation via state + effects are not deterministic frame-capture / seek-driven targets. Recommend the runtime interop pattern.
- **Run both render pipelines simultaneously.** That is the runtime interop pattern — a separate solution for sources that fail this skill's lint.
- **Author new content.** The bridge translates existing compositions; it does not create. Use `content-os-general-video` for new builds.
- **Mix paradigms in one output.** The target is fully in one paradigm. Hybrid output is the interop pattern, not a translation.

## Delegation

This skill is an orchestrator — it carries no rules of its own beyond the workflow contract. It delegates composition structure to `content-os-core`, tween mapping to `content-os-animation`, pose/determinism to `content-os-keyframes`, block reuse to `content-os-registry`, and media element mapping to `content-os-media`. Brand/voice/channel (`content-os-creative`) is out of scope — the bridge translates existing compositions, it does not re-author creative. The intent router (`content-os-router`) owns route decisions; this skill is invoked only after the router resolves a translation intent.
