---
name: metodologia-prompt-library
description: This skill should be used when the user asks to "create a prompt library", "compile four-level workshop prompts", "link prompts to playbook steps", or "verify a Trainer OS prompt collection".
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata: {owner: MetodologIA, lifecycle_state: candidate, execution_scope: local-candidate-routing-only}
---

# Prompt Library

Route approved Trainer OS prompts to the shared deterministic library adapter.

1. Validate route, design, plan, content, rights and hash bindings.
2. Require exactly levels `1, 2, 3, 4` for every prompt and a one-to-one mapping between prompt
   `stepId` and every materialized playbook step.
3. Preserve localized labels, semantic headings, playbook backlinks and icon-only copy controls
   with accessible names. Keep prompt text and navigation usable without JS; copy is optional.
4. Invoke the shared adapter; never recreate HTML, copy scripts or prompt content here.
5. Replay in clean roots and compare bytes, trees, manifests and receipts.
6. Reject duplicate or missing step bindings, level drift, materialization IDs on prompt artifacts,
   response persistence, network, tracking, private locators, stale hashes and publication.

Load [references/operating-contract.md](references/operating-contract.md) only for detailed
acceptance rules. Return `RENDERED_DRAFT`; runtime remains blocked pending evaluation.
