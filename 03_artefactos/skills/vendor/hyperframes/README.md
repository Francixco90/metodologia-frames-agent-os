# HyperFrames (vendored reference)

> **Reference-only. No auto-execution.** These files are audited upstream copies used
> as a pattern source for the locally-authored `content-os-*` skills (Fases 2-4). They
> are never executed, never imported by the project build, and never overwrite native
> MetodologIA skills. Mirrors the `skills/vendor/` policy.

## Source

| field | value |
|---|---|
| repo | <https://github.com/heygen-com/hyperframes> |
| commit | `3cf268e1e54b9f1868442a37b7bfafecc0e2355f` |
| version | 0.7.90 |
| license | Apache-2.0 (`LICENSE` at this root) |
| attribution | Copyright (c) HeyGen, Inc. — HyperFrames |
| audit date | 2026-08-03 |
| lockfile | `docs/hyperframes/source-lock.json` |
| audit report | `docs/hyperframes/audit-report.md` |

## What is here

25 skills, text-only (`.md`, `.mjs`, `.html`, `.json`, `.tsx`, `.ts`, `.cjs`, `.js`,
`.sh`, `.py`, `.txt`, `.svg`, `.yaml`, `.yml`, `.css`). Binaries (`.png`, `.mp3`,
`.mp4`, `.woff2`, …) and `node_modules/` were **not** copied. **15 from Fase 0** +
**10 vendored in Fase 1A** (the adoption scope expanded for the Frames ContentOS homólogo
program — see `docs/content-os/capability-matrix.md`).

| skill | files | phase | role |
|---|---|---|---|
| `hyperframes` | 17 | 0 | router / intro |
| `hyperframes-core` | 19 | 0 | composition contract (HTML + `data-*` timing) |
| `hyperframes-animation` | 121 | 0 | GSAP rules / blueprints / transitions |
| `hyperframes-creative` | 72 | 0 | brand / pacing / narration / composition |
| `hyperframes-keyframes` | 3 | 0 | pose contract, lint / check / snapshot |
| `hyperframes-registry` | 10 | 0 | reusable blocks registry |
| `media-use` | 132 | 0 | media OS (resolve / generate / operate / remember) |
| `remotion-to-hyperframes` | 64 | 0 | Remotion → HTML bridge (SSIM-graded) |
| `slideshow` | 2 | 0 | navigable deck |
| `embedded-captions` | 95 | 0 | caption pipeline |
| `pr-to-video` | 30 | 0 | GitHub PR → video workflow |
| `motion-graphics` | 23 | 0 | short unnarrated motion |
| `product-launch-video` | 28 | 0 | launch video workflow |
| `faceless-explainer` | 24 | 0 | text → video workflow |
| `general-video` | 4 | 0 | general router |
| `talking-head-recut` | 22 | 1A | talking-head recut workflow |
| `music-to-video` | 65 | 1A | track → video workflow |
| `changelog-video` | 8 | 1A | weekly changelog `.md` → video |
| `figma` | 2 | 1A | Figma import (assets / tokens / components / storyboard) |
| `hyperframes-cli` | 11 | 1A | CLI loop (init / author / lint / check / preview / render / verify) |
| `captions-overlay` | 1 | 1A | caption overlay doctrine (drop / rail / embed + overlay law) |
| `motion-doctrine` | 4 | 1A | GATEWAY motion law (vector law + seam gate + no idle wobble) |
| `cut-the-curve` | 2 | 1A | seam technique catalog (5 seams + waterfall entry + nudge curve) |
| `seam-craft` | 1 | 1A | render prerequisites for scene seams (white-flash guard) |
| `oversized-cursor` | 1 | 1A | oversized macOS cursor technique (eye-carrier) |

## What is NOT here (and why)

- `hyperframes-media` — retired upstream (v0.7.39), merged into `media-use`.
- `website-to-hyperframes` — not a skill in the source repo; an external example repo
  referenced only in `docs/showcase.mdx`.
- `hyperframes-tts`, `audio-reactive`, `transitions`, `website-to-video`, `compose-video` —
  referenced in the program plan but not present as upstream skills at the vendored commit;
  not vendored.

## Exclusions enforced

`prettier`, `eslint`, `tsconfig` and `check-privacy.ts` all skip `skills/vendor/**`:
vendors are frozen at an audited commit and are not reformatted, type-checked, linted
or privacy-scanned by the first-party pipeline. Integrity is governed by
`docs/hyperframes/source-lock.json` (per-file sha256) and the audit report.

## Apache-2.0 notice

Licensed under the Apache License, Version 2.0 (the `LICENSE` file in this directory).
You may not use these files except in compliance with the License. Derivative works
(the `content-os-*` skills built in Fases 2-4) are locally authored under
`LicenseRef-MetodologIA-Internal` and do not carry the Apache license forward; the
Apache-2.0 notice and attribution are preserved here per the license terms.