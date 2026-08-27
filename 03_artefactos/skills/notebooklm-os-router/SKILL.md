---
name: notebooklm-os-router
description: Route natural-language requests to initialize, audit, create, operate, sync, evolve, or check a NotebookLM or Gemini Notebook workspace, including brand-content notebook requests; planning never performs external mutations.
metadata: {owner: MetodologIA, lifecycle_state: candidate, execution_scope: local-planning}
---

# NotebookLM OS Router

## Trigger

Use for any NotebookLM/Gemini Notebook lifecycle request or a request to build a brand-content notebook.

## Inputs

Natural-language request, known notebook/profile digests and declared effects.

## Outputs

Normalize `NotebookIntentV1`, lock R10, select the shortest N00–N09 path and emit deterministic
`NotebookPlanV1`. Invoke `notebooklm-brand-intake` for brand intent. Mixed content work hands R6's
brief to R10 without merging authority. `/notebooklm:*` aliases never bypass gates.

## Stop rules

Stop on missing purpose, audience or effect, unresolved route, or before the gate for any external mutation.

## Done contract

Route, plan, specialist bindings, missing gates and coverage gaps are explicit. Planning is not execution.
