---
name: notebooklm-os-router
description: Use when a request asks to initialize, audit, create, operate, sync, evolve, or check status of a NotebookLM or Gemini Notebook workspace; routes natural language to R10 and the N00-N09 workflow without performing external mutations.
metadata: {owner: MetodologIA, lifecycle_state: candidate, execution_scope: local-planning}
---

# NotebookLM OS Router

1. Normalize the request into `NotebookIntentV1`; ask only for missing purpose, audience or effect.
2. Lock R10. If content design is also requested, hand the brief from R6 to R10; do not merge authority.
3. Select the shortest valid N00-N09 path and bind each step to its specialist.
4. Treat `/notebooklm:init|audit|create|curate|studio|verify|sync|share|status|evolve` as aliases, not authority bypasses.
5. Output a deterministic `NotebookPlanV1`. Stop before any external mutation at its required NLM gate.

Done means a route, plan, missing gates and coverage gaps are explicit. Planning is not execution.
