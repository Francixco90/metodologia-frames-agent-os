---
name: notebooklm-brand-verifier
description: Independently verify brand grounding responses or generated content against approved evidence, voice, assets, locale, accessibility, channel contracts, and brand-separation rules.
metadata: {owner: MetodologIA, lifecycle_state: candidate, execution_scope: independent-verification}
---

# NotebookLM Brand Verifier

## Trigger

Use independently at N06 for brand grounding responses or at N08 after inspectable artifact content exists.

## Inputs

Exact grounding query/response or brief/artifact, plus profile digest and source set. Read
[references/qa-rubric.md](references/qa-rubric.md) for observable checks and severity.

## Outputs

Emit a grounding result at N06 or `BrandQaReceiptV1` at N08 for claim traceability, voice, vocabulary, locale, asset IDs,
visual tokens, channel, accessibility, instruction leakage and cross-brand contamination. Distinguish
fixable defects from blocked rights, claims or authority.

## Stop rules

Never grade from remembered branding or silently rewrite output. Wrong voice/assets, internal
instructions, brand mixing or an untraceable strong claim rejects the artifact.

## Done contract

Every acceptance criterion has evidence or a gap. `VERIFIED_DRAFT` is the maximum automatic state
and remains below editorial approval, sharing and publication.
