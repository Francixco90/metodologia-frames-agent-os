---
name: metodologia-masterclass-pdf
description: This skill should be used when the user asks to "create a MetodologIA masterclass PDF", "compile an 18-moment masterclass", "build a 90-minute training deck", "produce the official Trainer OS presentation", or "verify a deterministic masterclass PDF".
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: candidate
  execution_scope: local-candidate-routing-only
---

# MetodologIA Masterclass PDF

Route an approved `trainer-masterclass-content-v1` to the shared native PDF compiler. Treat the
PDF as the official masterclass; treat any HTML viewer as local QA only.

## Procedure

1. Validate route-spec, design-lock, artifact-plan, content and local asset bindings.
2. Require exactly 18 moments totaling 90 base minutes plus 30 optional extension minutes.
3. Resolve the locked MetodologIA colors and typography intent. Require typed local receipts for
   renderer policy, the exact Node runtime and the authorized PDF Standard-14 font.
4. Invoke the shared Trainer OS compiler. Do not recreate PDF code, templates or content inside
   this skill.
5. Build requested ES, EN and PT variants only when fully supplied. Require exact locale parity,
   18 tagged pages, one H1 and three paragraphs per page, decorative graphics marked as
   artifacts, localized timing, selectable text and fail-closed overflow.
6. Replay in a clean process and compare exact bytes and output tree. Verify hashes, rights,
   privacy, symlinks, residual staging and absence of dates, randomness, network and private
   locators.
7. Return `RENDERED_DRAFT` with gaps. Never grant approval or publication.

Read [references/operating-contract.md](references/operating-contract.md) before compilation or
review. Stop when authority receipts, fonts, rights, locales or hashes are missing or stale.
