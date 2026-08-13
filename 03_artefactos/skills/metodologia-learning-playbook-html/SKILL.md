---
name: metodologia-learning-playbook-html
description: This skill should be used when the user asks to "create a learning playbook", "compile a 12-chapter playbook", "build a multilingual training guide", or "verify a Trainer OS playbook".
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata: {owner: MetodologIA, lifecycle_state: candidate, execution_scope: local-candidate-routing-only}
---

# Learning Playbook HTML

Route approved Trainer OS content to the shared deterministic playbook adapter.

1. Validate route, design, artifact plan, content, local rights and hash bindings.
2. Require exactly 12 essentials. Declare only zero to seven useful optionals, then materialize
   the complete declared set; never add filler.
3. Preserve ordered chapters, globally unique step IDs, supplied locale content, concise CTA, semantic HTML,
   fragments and print. Keep core content and navigation usable without JS; copy is optional.
4. Invoke the shared adapter; never recreate HTML, CSS or content here.
5. Replay in clean roots and compare exact bytes, output trees, manifests and receipts.
6. Reject undeclared optionals, missing steps, structural drift, network, tracking, private
   locators, response persistence, stale hashes and publication.

Load [references/operating-contract.md](references/operating-contract.md) only for detailed
acceptance rules. Return `RENDERED_DRAFT`; runtime remains blocked pending evaluation.
