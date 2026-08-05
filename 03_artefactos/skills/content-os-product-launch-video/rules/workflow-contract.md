# Workflow Contract — Frames ContentOS Product Launch Video

Ground-truth rules. Orchestrator enforces; capabilities execute.

1. **Orchestrator, no rules.** This workflow orchestrates steps + gates. Design
   and motion rules live in capabilities. Do not duplicate.
2. **Capture is Step 1 (URL input), no fabrication.** Explicit URL → Playwright
   capture. `capture/BLOCKED.md` = hard stop: report reason, no partial
   consumption, no synthetic fallback. Script/brief → no-capture path. State
   `capture_blocked: true` = `capture-blocked` violation.
3. **Step-gated.** Each step has a gate. No gate passed → no advance. Steps
   user-gated (0, 3, 6) pause for approval.
4. **Delegate capabilities on-demand.** Load only what the active step needs.
   Capabilities are never deliverable owners; the workflow is.
5. **Render-path offline-first.** Compositions (frames) offline/deterministic.
   Step 1 capture uses Playwright (single network step, given a URL). TTS/audio
   via `content-os-media` offline cascade (default); remote opt-in auth-gated,
   fail-closed without creds. No network in render path (Steps 5-6). State itself
   offline (no https URLs in state — source_ref is normalized domain/brand).
6. **Deterministic.** Same URL + same design + same frames → same render. No
   `Date.now()`/`Math.random()`/`new Date()` in compositions (inherits core).
7. **Seek-safe.** GSAP `paused: true`, scrubbed to frame `t` (inherits
   `content-os-animation`). No `repeat: -1`, no relative `+=`, no CSS
   `transition:` on animated elements.
8. **RENDERED_DRAFT != HUMAN_APPROVED.** `renders/video.mp4` is
   `RENDERED_DRAFT`. `finalize` gate passed without render = `no-render`
   violation. `READY`/publication requires human gates G13-G17 (manual by
   design).

## Violation codes (audit)

| Code                  | Trigger                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| `missing-gate`        | step with invalid state, unknown step, wrong route                                                       |
| `step-out-of-order`   | steps not in canonical order (setup→capture→design→storyboard→audio→visual-design→build-frames→finalize) |
| `capture-blocked`     | `capture_blocked: true` (hard-stop not respected, fabricated)                                            |
| `no-capture-for-url`  | `source_type: url` + `capture: false` (URL input must capture)                                           |
| `no-render`           | `finalize` gate-passed + `rendered: false`                                                               |
| `network-in-workflow` | `https://` URL in state, or `offline: false`                                                             |

## Stop rules

- Workflow auditable (audit PASS), all gates passed, MP4 exists: STOP workflow.
- Step user-gated without approval: STOP, request approval.
- `capture/BLOCKED.md` or capture `ok: false`: STOP, report reason, no fabricate.
- TTS unavailable and not silent marker: STOP, mark `coverage_gap` or silent.
- No brief (router did not dispatch): STOP, route via `content-os-router`.
