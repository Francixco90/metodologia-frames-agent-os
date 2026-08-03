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

15 skills, text-only (`.md`, `.mjs`, `.html`, `.json`, `.tsx`, `.ts`, `.cjs`, `.js`,
`.sh`, `.py`, `.txt`, `.svg`, `.yaml`, `.yml`, `.css`). Binaries (`.png`, `.mp3`,
`.mp4`, `.woff2`, …) and `node_modules/` were **not** copied.

| skill | files | role |
|---|---|---|
| `hyperframes` | 17 | router / intro |
| `hyperframes-core` | 19 | composition contract (HTML + `data-*` timing) |
| `hyperframes-animation` | 121 | GSAP rules / blueprints / transitions |
| `hyperframes-creative` | 72 | brand / pacing / narration / composition |
| `hyperframes-keyframes` | 3 | pose contract, lint / check / snapshot |
| `hyperframes-registry` | 10 | reusable blocks registry |
| `media-use` | 132 | media OS (resolve / generate / operate / remember) |
| `remotion-to-hyperframes` | 64 | Remotion → HTML bridge (SSIM-graded) |
| `slideshow` | 2 | navigable deck |
| `embedded-captions` | 95 | caption pipeline |
| `pr-to-video` | 30 | GitHub PR → video workflow |
| `motion-graphics` | 23 | short unnarrated motion |
| `product-launch-video` | 28 | launch video workflow |
| `faceless-explainer` | 24 | text → video workflow |
| `general-video` | 4 | general router |

## What is NOT here (and why)

- `hyperframes-media` — retired upstream (v0.7.39), merged into `media-use`.
- `website-to-hyperframes` — not a skill in the source repo; an external example repo
  referenced only in `docs/showcase.mdx`.
- `figma`, `hyperframes-cli`, `music-to-video`, `talking-head-recut` — present upstream
  but outside the 16-skill adoption scope for Content OS Fase 0.

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