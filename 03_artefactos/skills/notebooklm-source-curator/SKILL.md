---
name: notebooklm-source-curator
description: Use when planning, importing, deduplicating, replacing, tagging, selecting, or synchronizing NotebookLM sources with provenance and authority controls.
metadata: {owner: MetodologIA, lifecycle_state: candidate, execution_scope: governed-source-planning}
---

# NotebookLM Source Curator

## Trigger

Use to plan, import, deduplicate, replace, tag, select or synchronize notebook sources.

## Inputs

Candidate sources and `NotebookSourceManifestV1` entries, including provenance and rights.

## Outputs

Resolve identity by Drive ID, canonical URL, then hash—never title. Enforce naming, authority,
vigency and successors within 15 controls, 15 assets/examples and 20 working sources. Preserve brand
conversation, attachment and extraction as separate nodes; Markdown remains a projection.

## Stop rules

Block conflicts, unsupported claims, unknown rights and out-of-scope or all-sources sets. Import
waits for `NLM_PLAN_APPROVED`; Drive sync for `NLM_SYNC_APPROVED`.

## Done contract

Manifest, explicit `source_ids`, deduplication decisions and gaps are stable; every mutation has readback.
