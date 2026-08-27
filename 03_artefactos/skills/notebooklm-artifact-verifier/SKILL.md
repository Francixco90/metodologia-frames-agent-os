---
name: notebooklm-artifact-verifier
description: Use after NotebookLM Studio generation to download, read back, and verify artifact type, language, content, explicit sources, bytes, citations, claims, accessibility, and quality.
metadata: {owner: MetodologIA, lifecycle_state: candidate, execution_scope: independent-verification}
---

# NotebookLM Artifact Verifier

## Trigger

Use after Studio generation or when an artifact claims completion.

## Inputs

Exact `StudioBriefV1`, artifact reference, source set and downloadable or inspectable content.

## Outputs

Verify requested/obtained type, explicit sources, prompt digest, bytes, language, structure, claims,
citations and rights; emit `StudioArtifactReceiptV1`. Branded output also needs `BrandQaReceiptV1`.

## Stop rules

A visible card, zero bytes, unread content, wrong type or unknown sources cannot pass.

## Done contract

Only matching type plus downloaded/read content may reach `VERIFIED_DRAFT`, which remains below
`HUMAN_APPROVED` and `PUBLISHED`.
