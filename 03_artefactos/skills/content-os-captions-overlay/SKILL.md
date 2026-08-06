---
name: content-os-captions-overlay
description: This skill should be used when the user asks to "add captions to a video", "decide whether a phrase should be dropped, ride the rail, or be promoted to an embedded climax", "lay out a composition that will carry captions", "center a composition under captions", or "apply the caption overlay doctrine". Caption overlay doctrine for the Frames ContentOS toolchain: the caption model (drop / rail / embed) and the overlay law — captions are an OVERLAY composited on top of the film, never a reserved bottom band you shift content up to avoid. Applies ON TOP of content-os-embedded-captions. Load when adding captions/subtitles to a talking-head or launch video, when centering a composition on the true frame center under captions, or when reserving a keep-out band (do NOT). Unclear → content-os-router.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
compatibility: Applies ON TOP of content-os-embedded-captions (the rail+embed model). Orchestrates content-os-core (HTML composition + Playwright/FFmpeg render adapter), content-os-embedded-captions (verbatim rail, embed behind subject). Input = transcript + composition. Caption line composited ON TOP as overlay (bottom ~5-8% of canvas height). Output RENDERED_DRAFT. Constraint #13 (captions overlay, keep-out band retired) from the product-launch-video scene agent.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Captions Overlay Doctrine

Derivada de `captions-overlay` (`heygen-com/hyperframes`, Apache-2.0). Locally-authored
adaptation for the Frames ContentOS toolchain (HTML composition → Playwright render → MP4).
Vendor reference: `skills/vendor/hyperframes/captions-overlay/SKILL.md` (read-only).

> **Overlay doctrine — supplements the upstream `content-os-embedded-captions` skill.
> Applies ON TOP of it; do not expect it folded into the upstream skill.**

## What this skill does

Two ideas combine. First, the **caption model** — every spoken phrase is `drop`, `rail`, or
`embed`, and embed is the scarce earned peak, not the default. Second, the **overlay law**
— a caption line is composited ON TOP of the film as an overlay; it is NOT a reserved zone,
so you never shift content up or leave a dead band to "make room" for it. The two reinforce
each other: because captions ride as an overlay (the verbatim rail in front, the occasional
embed behind the subject), the composition keeps its full frame and centers on the true
vertical center.

## The caption model — drop / rail / embed

Every spoken phrase is one of three things (verbatim from `content-os-embedded-captions`):

|           | What                                             | How it's shown                                                                                                                                                    |
| --------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **drop**  | filler — um/uh, stutters, self-corrections       | not shown                                                                                                                                                         |
| **rail**  | the default — ordinary spoken content (verbatim) | clean lower-third subtitle, **in front**, readable. A punch word can get an inline `emphasis` highlight (accent colour / active-word pop) — it stays on the rail. |
| **embed** | a promoted peak — the headline beat              | one big word composited **behind the subject** (matte occlusion), designed entrance + exit                                                                        |

**The rail carries most of the text; embed is the scarce, earned peak** — ≤1 per beat,
never two adjacent/co-visible, spaced ≥ a beat apart. A short clip → usually one embed; a
long explainer → ~one per section. Embedding every word is the common mistake.

This is the **Standard** mode shape (rail = the verbatim lower-third; embed = the climax
composited behind the subject). **Cinematic** mode drops the rail and makes everything
embed-style — use it only for pure-cinematic asks, never for explainer / voiceover where the
words must read.

### Rail-first, embed-scarce (the load-bearing rules)

Quoted from the `content-os-embedded-captions` non-negotiables:

- **Rail-first for talking-head / explainer.** Don't embed the whole transcript — most
  text is the rail; embed only peaks. Embedding everything is the default mistake.
- **Embed is scarce + spaced.** ≤1 embed per sentence/beat, never two adjacent or
  co-visible, ≥ a beat apart, at most one `apex`. climax = per-beat peak, **not** "the
  single payoff of the entire clip."

## The overlay law — captions are NOT a reserved band

In a generated composition, when captions are enabled, finalize composites a **small,
minimal word-by-word caption line** as an overlay layer ON TOP of the whole film (a single
text line, bottom-centered, roughly the bottom ~5-8% of canvas height). It is an overlay,
not a reserved zone (verbatim from constraint #13 of the product-launch-video scene agent):

- **Center the composition on the TRUE vertical center — y = H / 2** (landscape 540,
  portrait 960). Do not shift content up to "make room" for captions; a composition
  centered at 0.42 × H with a dead lower band is the bug, not the fix.
- Content may extend to the canvas bottom. Full-bleed subjects, rails, and backgrounds all
  welcome.
- **One soft courtesy rule:** avoid parking _critical small readable text_ (a URL line, a
  legal line, a sub-caption) exactly in the bottom ~80px center span where the caption line
  sits — the overlay would fight it. Large imagery / cards / ambient content under the
  captions is fine; the caption skin is designed to read over content.
- There is no machine keep-out gate (the old `captions.mjs keepout` check is retired).
  Finalize snapshot QA judges caption-over-content legibility visually.

**When captions are disabled:** identical positioning freedom — the overlay simply doesn't
exist.

## Why these two rules are one doctrine

The model says the rail rides **in front** and an embed is a rare word composited **behind
the subject** — both are layers added to footage that ships untouched. The overlay law says
the caption line is a layer composited **on top** of the whole film, not a band carved out
of the layout. In both the captioning and launch-video pipelines, captions are an overlay
you add, not a zone you reserve: keep the full frame, center on true center, let the rail
carry the verbatim words, and promote an embed only at a genuine peak — scarce, spaced,
never two at once. Judge legibility of captions-over-content visually, not by a keep-out gate.

## Determinism contract (inherited from content-os-core)

- No `Math.random()` / `Date.now()` / `new Date()` / `fetch()` / `setTimeout()` /
  `setInterval()` in any caption or composition code.
- GSAP timelines `paused: true`, driven by the Frames ContentOS frame clock
  (`window.__timelines`, `data-start`, `data-duration`).
- No network in the render path.
- `RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED`.

## Dependencies

- `content-os-embedded-captions` — the upstream rail+embed model this skill applies ON TOP
  of.
- `content-os-core` — HTML composition contract + Playwright render adapter.
- Toolchain: Playwright 1.61.1, FFmpeg (libx264), GSAP 3.15.0 (all pinned in `package.json`).

## What this skill does NOT do

- Does not reserve a bottom band for captions (overlay, not a zone).
- Does not shift content up to make room (center on true vertical center y = H / 2).
- Does not embed every word (rail-first, embed-scarce — ≤1 per beat, spaced ≥ a beat).
- Does not gate legibility by a machine keep-out check (judge visually).
- Does not activate connectors or publish; no network in the render path.
- Does not persist chain-of-thought, secrets, PII, or private locators.

## Check

`node skills/content-os-captions-overlay/scripts/check-skill.mjs` — verifies required
files, pinned deps, contract tokens, forbidden APIs absent, negative fixture documents
violations.
