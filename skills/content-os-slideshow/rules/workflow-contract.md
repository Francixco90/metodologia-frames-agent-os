# Workflow Contract — Content OS Slideshow

Ground-truth rules. Orchestrator enforces; capabilities execute.

1. **Orchestrator, no rules.** This workflow orchestrates steps + gates. Design
   and layout rules live in capabilities. Do not duplicate.
2. **Navigable deck, no MP4.** Output is the deck HTML (slides discretos + JSON
   island). `rendered_mp4: true` = `render-mp4` violation (deck has no
   master-root composition; render resolves only the first scene and emits a
   silently truncated MP4). No master-root composition wrapping the slides.
3. **Unnarrated.** Deck has no narration. `vo_mode: silent`, `has_script: false`.
   Speaker notes are presenter-only text (editable in presenter view, stored in
   localStorage), not TTS.
4. **Step-gated.** Each step has a gate. No gate passed → no advance. Steps
   user-gated (0, 5) pause for approval.
5. **Delegate capabilities on-demand.** Load only what the active step needs.
6. **Render-path offline-first.** Deck HTML offline/deterministic. No network in
   compositions. Assets (images) via `content-os-registry` (offline cascade).
7. **Deterministic.** Same deck intent + same design + same scenes → same deck.
   No `Date.now()`/`Math.random()`/`new Date()` in compositions.
8. **Seek-safe.** GSAP `paused: true`, scrubbed via seek (fragment navigation is
   seek-driven, not play-driven). No `repeat: -1`, no relative `+=`, no CSS
   `transition:` on animated elements.
9. **Slide writing rules.** Headline = complete-sentence claim (no label).
   `headline_label: true` = `label-not-claim` violation. One idea + one visual
   per slide. Lead with punchline. Font ≥30pt.
10. **RENDERED_DRAFT != HUMAN_APPROVED.** `renders/deck.html` is `RENDERED_DRAFT`.
    `finalize` gate passed without presentable deck = `no-deck` violation.
    `READY`/publication requires human gates G13-G17 (manual).

## Non-negotiables (inherits vendor)

- Headline is a complete-sentence claim, never a label.
- One idea + one visual per slide.
- Font minimum 30pt equivalent (headline 72-96px at 1920×1080; body ≥48px; never
  below 40px for audience-readable text).
- Stacked scene frames: both visual hiding + event gating (`opacity` +
  `visibility` + `pointer-events`).
- Fragment times within slide `[start, end]`.
- No two main-line slides overlap in time.
- Every `slide.sceneId` resolves a scene; every `hotspot.target` references a
  `slideSequence` id.

## Violation codes (audit)

| Code                  | Trigger                                                                |
| --------------------- | ---------------------------------------------------------------------- |
| `missing-gate`        | step with invalid state, unknown step, wrong route                     |
| `step-out-of-order`   | steps not in canonical order (setup→plan→design→build→verify→finalize) |
| `no-deck`             | `finalize` gate-passed + `deck_presentable: false`                     |
| `network-in-workflow` | `https://` URL in state, or `offline: false`                           |
| `render-mp4`          | `rendered_mp4: true` (deck has no master-root; render truncates)       |
| `label-not-claim`     | `headline_label: true` (headline must be a claim, not a label)         |

## Stop rules

- Workflow auditable (audit PASS), all gates passed, deck presentable: STOP.
- Step user-gated without approval: STOP, request approval.
- Intent not confirmed (user does not want a slideshow): STOP, re-route via
  `content-os-router`.
- No brief (router did not dispatch): STOP, route via `content-os-router`.
- Slide headline is a label and user refuses to make it a claim: STOP, refuse
  (no fabricated claims).
