---
name: notebooklm-artifact-verifier
description: Use after NotebookLM Studio generation to download, read back, and verify artifact type, language, content, explicit sources, bytes, citations, claims, accessibility, and quality.
metadata: {owner: MetodologIA, lifecycle_state: candidate, execution_scope: independent-verification}
---

# NotebookLM Artifact Verifier

Compare the result to its `StudioBriefV1`. Confirm requested and obtained type, explicit sources,
prompt digest, non-zero downloaded bytes or inspectable content, language, structure, claims,
citations and asset rights. Emit `StudioArtifactReceiptV1` with every gap.

Only matching type plus downloaded/read content can reach `VERIFIED_DRAFT`. Never infer success
from a visible Studio card. `VERIFIED_DRAFT` remains below `HUMAN_APPROVED` and `PUBLISHED`.
