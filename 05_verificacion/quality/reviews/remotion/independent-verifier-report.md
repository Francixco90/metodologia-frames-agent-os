# Independent A07/A08 verifier report

## Verdict

**PASS — technical local render only.** The reviewed artifact is correctly bounded as
`RENDERED_DRAFT · LOCAL TEST ONLY`; its governed workflow remains
`BLOCKED_BEFORE_SOURCE_LOCK`. This verdict does not approve the component registry, human review,
release, external distribution or publication. [CONFIG]

No critical, high, medium or low defects remain in the reviewed A07/A08 scope. [CÓDIGO]

## Evidence

- The passing `BUILD_VALIDATED` report binds 56 current inputs under source-set
  `78a2874842acf36114221dd7c3193e474bf6a2c91d498e7e3e654dc504c38b6f`; independent
  recomputation found zero mismatches. All three media outputs were generated after that report.
  [CÓDIGO]
- Review A and B are byte-identical at
  `b37d3327e1a3c46fe5f0586a912f62bd831abf8faec046efe419ef238f394010`; their
  1,231 decoded frame records are also identical, with normalized pixel digest
  `d5f0cc1a5abef9e0488933cf992291d8e7fce870ece5b4219ae31b213de22898`.
  [CÓDIGO]
- Each full review contains exactly one H.264 video stream, 1080×1920, 30 fps, 1,231 frames,
  `yuv420p`, BT.709 and no audio or other streams. The smoke output contains one 270×480,
  90-frame video stream and no audio. [CÓDIGO]
- The package contains exactly 27 uniquely named canonical stills at 27 distinct frames and one
  contact sheet. Every still matches its receipt and manifest hash; every still-to-review
  comparison passes SSIM, with a minimum of `0.975161` against the `0.97` gate. [CÓDIGO]
- The selected direction is `PROP-VS001-02-RT04`. The four incorporated committee elements retain
  their exact identity and order across the committee decision, canonical signatures, campaign
  copy and generated beat-map contract. [CÓDIGO]
- The runtime layout guard passed both full renders, the remote-fetch canary is hash-bound and
  passing, and four local fonts are hash/license-bound under OFL 1.1. The Linux network namespace
  and exact upstream font binary origin remain explicit coverage gaps. [CÓDIGO]
- The approval boundary contains only guidance and a fail-closed template. Human review remains
  pending, no Guardian receipt exists and `publish_authorized` is false. [DOC]

## Independent checks

- `pnpm verify:media` — PASS.
- Focused Remotion unit plus documentation contracts — 53/53 PASS.
- Focused ESLint — PASS.
- Focused Prettier — PASS.

## Residual limits

The canonical corpus remains 0/4, cross-host pixel equivalence is unverified, the authoritative
Linux offline namespace has not run, exact upstream font binary versions and Remotion commercial
eligibility remain unresolved, and human/Guardian approvals are absent. These are correctly
represented as `coverage_gap`; they block governed advancement and publication, not the bounded
technical-local verdict. [CONFIG]
