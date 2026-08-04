---
name: content-os-hyperframes-cli
description: This skill should be used when the user asks to "run the CLI development loop", "lint and check a composition", "preview then render a video", "diagnose a build or render failure", "run sub-composition smoke snapshots", or "verify a render output". The Content OS CLI development loop doctrine: init → author → lint → check → preview → render (only after approval) → verify. Covers lint/check/preview/render/snapshot/doctor, sub-composition smoke tests, JSON agent/CI conventions, and the rule that checks passing never grants a render — pause at the final preview and wait for approval. Maps the HyperFrames CLI surface onto the Content OS local render adapter. Unclear → content-os-router.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Orchestrates content-os-core (HTML composition + Playwright/FFmpeg render adapter), content-os-router (intent routing). Provides the CLI loop doctrine: lint → check → preview → render(after approval) → verify. Output RENDERED_DRAFT (renders/video.mp4). No render merely because checks pass — final preview is the approval gate.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Content OS CLI — development loop doctrine

Derivada de `hyperframes-cli` (`heygen-com/hyperframes`, Apache-2.0). Locally-authored
adaptation for the Content OS toolchain (HTML composition → Playwright render → MP4).
Vendor reference: `skills/vendor/hyperframes/hyperframes-cli/SKILL.md` (read-only).

## What this skill does

Defines the development loop for a Content OS composition project: scaffold, author, get
fast feedback, run the final gate, preview, render only after approval, verify the output.
The CLI requires Node.js 22+ and FFmpeg.

## Development loop

1. **Scaffold:** `init <project>` or capture a site. In non-TTY mode pass
   `--non-interactive --example=<name>`.
2. **Author:** write the composition using `content-os-core`.
3. **Fast feedback while editing:** run `lint` after the first HTML pass and after
   structural changes.
4. **Final gate:** run `check`; it reruns lint before opening the browser. Do NOT prepend a
   redundant standalone lint invocation. Add `--snapshots` for annotated overview frames.
5. **Sub-composition smoke test:** when `index.html` mounts `data-composition-src`, capture
   midpoint snapshots and inspect each mounted scene.
6. **Final preview:** run `preview`, hand the timeline project URL to the user, ask whether
   to revise or render.
7. **Render only after approval:** draft quality for iteration, high quality for delivery.
8. **Verify the output:** confirm the file exists, is non-empty, has a plausible duration.

```bash
# Fast iteration check; repeat while authoring as needed.
npx hyperframes lint

# Required final gate; includes lint.
npx hyperframes check
npx hyperframes preview
npx hyperframes render --quality high --output renders/video.mp4
test -s renders/video.mp4
ffprobe -v error -show_format renders/video.mp4
```

`check` runs lint first, then uses one browser session and one seek pass to audit runtime
errors, failed requests, layout, motion sidecar assertions, and WCAG contrast. Persistent
findings gate the exit code; transient entrance/exit findings are informational. Use
`--strict` to gate warnings.

## Two different preview surfaces

Do not confuse these states:

| Surface                   | When it may open                                       | Purpose                                     |
| ------------------------- | ------------------------------------------------------ | ------------------------------------------- |
| Storyboard board          | Before composition checks, only when `storyboard: yes` | Review plan cards and wireframe sketches    |
| Final composition preview | After `check` passes                                   | Review the assembled timeline before render |

The early board is NOT approval of the final video. Rendering always requires the final
approval defined by the review loop. `RENDERED_DRAFT != HUMAN_APPROVED`.

## Sub-composition smoke test

Static audits cannot catch every mount failure. When the project uses sub-compositions,
capture at least one visible midpoint for each host slot:

```bash
npx hyperframes snapshot --at <t1>,<t2>,<t3>
```

Treat tiny unstyled content, canvas-sized icons, missing hero elements, or
timeline-registration timeouts as render-blocking mount defects.

## Agent conventions

- Prefer `--json` for agent and CI calls.
- `doctor --json` always exits zero. Gate on its payload:
  `npx hyperframes doctor --json | jq -e '.ok' >/dev/null`
- Non-TTY mode is automatic. `init` requires `--example` there; use `--non-interactive` to
  force deterministic behavior on a TTY.
- Use one `HYPERFRAMES_RUN_ID` for all commands in the same verification loop.
- Use `--strict`, `--strict-all`, and `--strict-variables` when the corresponding warnings,
  variables, or CI conditions must gate the render.
- JSON paths redact the home directory as `$HOME`; do not reverse the redaction.
- Never render merely because checks pass. Pause at the final preview and wait for
  approval.

## Studio-directed edits

When the user refers to "this element" or the current selection, query Studio instead of
guessing:

```bash
npx hyperframes preview --context --json --context-fields selection
```

Use `selection.target.hfId` when available, otherwise its selector and source file. If the
result reports `no-selection`, ask the user to click the element and rerun. Request only the
context slices needed.

## Render choices

| Need                          | Command                                                  |
| ----------------------------- | -------------------------------------------------------- |
| Fast local iteration          | `render --quality draft`                                 |
| Final local delivery          | `render --quality high --output renders/video.mp4`       |
| Reproducible container render | `render --docker --strict --output renders/video.mp4`    |
| Local variable-driven batch   | `render --batch rows.json --output "renders/{name}.mp4"` |

Skill attribution is automatic — a project scaffolded by a workflow records its owning skill
in `hyperframes.json`, and every later render inherits it. Pass `--skill=<slug>` explicitly
only to stamp a project that was not created through a workflow.

After verifying a successful render, send one feedback report unless telemetry is disabled
or the user opted out. For any bug or friction, capture a reproduction packet before
submitting; do not send only a symptom summary. Strip absolute paths, home-directory
prefixes, and user/machine identifiers from feedback (it is submitted to a public channel).

## Read the matching reference before running a command

The CLI commands have mandatory command contracts. Before running a command, read its
matching reference. For composition variables, read `content-os-core` variables-and-media.
For `present`, read `content-os-slideshow`; before `keyframes`, read `content-os-keyframes`.
For TTS, transcription, captions, or background removal choices, use `content-os-media`.

## Determinism contract (inherited from content-os-core)

- No `Math.random()` / `Date.now()` / `new Date()` / `fetch()` / `setTimeout()` /
  `setInterval()` in any composition code.
- GSAP timelines `paused: true`, driven by the Content OS frame clock
  (`window.__timelines`, `data-start`, `data-duration`).
- No network in the render path.
- `RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED`.

## Dependencies

- `content-os-core` — HTML composition contract + Playwright render adapter.
- `content-os-router` — intent routing.
- Toolchain: Playwright 1.61.1, FFmpeg (libx264), GSAP 3.15.0, Node.js 22+ (all pinned in
  `package.json`).

## What this skill does NOT do

- Does not render merely because checks pass (pause at preview, wait for approval).
- Does not prepend a redundant standalone lint before `check` (check includes lint).
- Does not reverse `$HOME` redaction in JSON paths.
- Does not activate connectors or publish; no network in the render path.
- Does not persist chain-of-thought, secrets, PII, or private locators.

## Check

`node skills/content-os-hyperframes-cli/scripts/check-skill.mjs` — verifies required files,
pinned deps, contract tokens, forbidden APIs absent, negative fixture documents violations.
