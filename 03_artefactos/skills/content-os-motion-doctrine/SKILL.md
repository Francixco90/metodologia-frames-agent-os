---
name: content-os-motion-doctrine
description: This skill should be used when the user asks to "compose any animation or video", "make scenes feel like one continuous camera move", "decide what happens at a seam", "pick a transition", "enforce motion continuity", "ban idle wobble", or "author the vector ledger before the master timeline". GATEWAY motion law for the Frames ContentOS toolchain — load FIRST before composing any animation. Covers the vector law (how you exit determines how you enter, incl. the Z scale-sign rule), the film's current, carrier elements, causal motion, the Seam Gate (build-gate enforcement), the ban on idle wobble (motion must PERFORM, not breathe), stillness-before-climax, and the sustained-motion routes. Routes to content-os-cut-the-curve (the technique catalog) and content-os-seam-craft (render prerequisites). These rules supersede generic / upstream motion guidance. Unclear → content-os-router.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
compatibility: GATEWAY — load before content-os-cut-the-curve (the catalog incl. waterfall entry + nudge curve), content-os-seam-craft (render prerequisites / white-flash guard), content-os-oversized-cursor (cursor-led action). Orchestrates content-os-core (HTML composition + Playwright/FFmpeg render adapter). Input = scene plan + VO timestamps. Output = vector ledger (ledger.json) + stamped master seams + RENDERED_DRAFT. Authoring order: vector ledger → stamp seams → sustained-motion route → carriers and causes → build comps → verify (seam-gate).
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Motion Doctrine (Gateway)

Derivada de `motion-doctrine` (`heygen-com/hyperframes`, Apache-2.0). Locally-authored
adaptation for the Frames ContentOS toolchain (HTML composition → Playwright render → MP4).
Vendor reference: `skills/vendor/hyperframes/motion-doctrine/SKILL.md` (read-only).

Read this before composing any animation. It decides WHAT happens at every seam and how
every scene performs; the technique skills implement it. These rules supersede generic /
upstream motion guidance. The failure this prevents: scenes authored in isolation — the
eye's momentum dies at every cut, and scenes wobble in place between entry and exit.

## Route map

| Decision (this skill)                      | Implementation skill                                      |
| ------------------------------------------ | --------------------------------------------------------- |
| Seam transition choice + parameters + code | `content-os-cut-the-curve` §1–5 (the catalog)             |
| Text / element entry cascades              | `content-os-cut-the-curve` §6 (waterfall entry)           |
| In-scene group repositioning (no cut)      | `content-os-cut-the-curve` §7 (nudge curve)               |
| Seam render mechanics / white-flash guard  | `content-os-seam-craft`                                   |
| Caption overlay doctrine                   | `content-os-captions-overlay` on top of embedded captions |

Authoring order: **vector ledger (`ledger.json`) → STAMP the master seams from it
(`scripts/seam-stamp.mjs --ledger ledger.json --write index.html`) → sustained-motion
route per phase → carriers and causes → build comps → VERIFY (`scripts/seam-gate.mjs`).**
Hand-author only Tier-A morphs/match-cuts; stamped seams pass the gate by construction.

## Doctrine body — router

Full law + performance receta lives in `references/doctrine-receta.md` (governed, hash-bound).
This is the gateway index — load the receta before authoring.

| Doctrine section        | Where                                       | Gate / rule                                                                                                  |
| ----------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| The vector law          | `references/doctrine-receta.md` § Part 1    | Exit vector determines entry: axis, direction, speed (mirrored eases), phase (cut mid-motion both sides)     |
| The current             | `references/doctrine-receta.md` § Part 1    | One dominant direction (house default LEFT); reserved vectors spent on meaning, never variety                |
| The vector ledger       | `references/doctrine-receta.md` § Part 1    | `ledger.json` at project root, one row per seam; exit/entry must match — fix the plan, not easing            |
| Carriers                | `references/doctrine-receta.md` § Part 1    | Hand a concrete carrier across the cut (matched position + velocity); never a crossfade                       |
| Causal motion           | `references/doctrine-receta.md` § Part 1    | Each move launched by the last (same-frame ignition); an uncaused flip is a ping-pong                        |
| The Seam Gate           | `references/doctrine-receta.md` § Part 1    | `seam-gate.mjs verify` exit 0 or the seam is not done (ledger consistency, zero overlap, Z sign)             |
| No idle wobble          | `references/doctrine-receta.md` § Part 2    | Idle sine loops BANNED; assign a sustained-motion route (5 routes) or add story                              |
| Stillness before climax | `references/doctrine-receta.md` § Part 2    | 0.3–0.75s pause between action and result                                                                    |
| Timing intents          | `references/doctrine-receta.md` § Part 2    | Entry ≤~800ms; exit ≈75% entry (cut-the-curve inverts); no `bounce.out`/`elastic.out`                        |
| Transition vocabulary   | `references/doctrine-receta.md` § Part 2    | 2–3 inter-scene transitions per film, repeated; default = cut-the-curve in the current                       |
| Anti-patterns           | `references/doctrine-receta.md` § Anti-Pat. | 11 don't/instead pairs (crossfade, grow-from-small vs inverse-zoom, direction flip, etc.)                    |

## Determinism contract (inherited from content-os-core)

- No `Math.random()` / `Date.now()` / `new Date()` / `fetch()` / `setTimeout()` /
  `setInterval()` in any motion or composition code.
- GSAP timelines `paused: true`, driven by the Frames ContentOS frame clock
  (`window.__timelines`, `data-start`, `data-duration`).
- No network in the render path.
- `RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED`.

## Dependencies

- `content-os-cut-the-curve` — the technique catalog (seams, waterfall entry, nudge curve).
- `content-os-seam-craft` — render prerequisites / white-flash guard.
- `content-os-core` — HTML composition contract + Playwright render adapter.
- Toolchain: Playwright 1.61.1, FFmpeg (libx264), GSAP 3.15.0 (all pinned in `package.json`).

## What this skill does NOT do

- Does not author scenes in isolation (vector ledger first).
- Does not permit crossfades between scenes (no carrier).
- Does not allow idle wobble to fill time (assign a sustained-motion route).
- Does not flip direction without a cause (ping-pong reads as error).
- Does not activate connectors or publish; no network in the render path.
- Does not persist chain-of-thought, secrets, PII, or private locators.

## Check

`node skills/content-os-motion-doctrine/scripts/check-skill.mjs` — verifies required
files, pinned deps, contract tokens, forbidden APIs absent, negative fixture documents
violations.