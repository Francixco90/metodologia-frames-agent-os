---
name: notebooklm-source-curator
description: Use when planning, importing, deduplicating, replacing, tagging, selecting, or synchronizing NotebookLM sources with provenance and authority controls.
metadata: {owner: MetodologIA, lifecycle_state: candidate, execution_scope: governed-source-planning}
---

# NotebookLM Source Curator

Validate every item with `NotebookSourceManifestV1`. Resolve identity by Drive ID, canonical URL,
then hash; never by title. Same title plus distinct hash is a new version or conflict, not a duplicate.
Enforce naming `NN-layer--slug--vX.Y`, authority, provenance, rights, vigency and replacement links.

Keep the active set within 15 controls, 15 assets/examples and 20 working sources. Prefer explicit
`source_ids`; all-sources selection needs a written exception. Import waits for `NLM_PLAN_APPROVED`;
Drive sync waits for `NLM_SYNC_APPROVED`. Read back every applied mutation.
