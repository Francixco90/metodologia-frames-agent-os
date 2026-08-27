---
schema: 'knowledge-document-metadata-v1'
document_id: 'PROMPT-CHANNEL-LINKEDIN-POST-V1'
title: 'LinkedIn Post Prompt Template'
version: '1.0'
status: 'ACTIVE'
authority: 'TEMPLATE'
layer: '30 Templates'
language: 'en'
response_locales: ['en', 'es-419']
routes: ['R40-CREATE']
tasks: ['create', 'brief', 'verify', 'linkedin-post']
audiences: ['content strategist', 'editor', 'producer', 'verifier']
tags: ['notebooklm-os', 'canon-v3', 'prompt-template', 'channel', 'linkedin-post']
keywords: ['linkedin-post', 'LinkedIn Post', 'source selection', 'idempotency', 'acceptance']
aliases: ['LinkedIn Post', 'Linkedin Post']
source_refs: ['CTRL-SYSTEM-PROMPT-V3', 'CTRL-AUTHORITY-ROUTER-V3', 'prompt.registry.v1']
rights: 'APPROVED'
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: []
related_ids: ['CTRL-KNOWLEDGE-MAP-V3', 'CTRL-KB-STANDARD-V3']
manifest_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml'
json_registry_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/prompt-system/prompt-registry.json#/templates/9'
json_pointer: '/templates/9'
---

<kb_document>
<abstract>

# Abstract

Publish a focused professional insight that earns attention without clickbait.
</abstract>
<navigation>

# Index

1. LinkedIn Post route
2. lengthRange
3. one or two-line hook to one-move CTA
4. Format boundary and verification
</navigation>

<routing>
# LinkedIn Post route

`R40-CREATE` selects 3-8 source IDs for linkedin-post. Draft compilation requires no external mutation gate; `HUMAN_APPROVED` and publication remain separate promotions. Invalid breadth returns `BLOCKED_ALL_SOURCES`. Spanish output uses `es-419` without voseo.
</routing>
<knowledge>

# LinkedIn Post contract

Registry location: `/templates/9`.

## Distinct inputs

- `lengthRange`

## Artifact sequence

1. one or two-line hook.
2. situation.
3. thesis.
4. up to three supports.
5. limit.
6. one-move CTA.

## Example

Example brief: write 180 words for operators, opening with a workflow tension and closing with one diagnostic question.
</knowledge>
<evidence>

# LinkedIn Post evidence

[METODOLOGIA][source_ref:CTRL-AUTHORITY-ROUTER-V3] Evidence test: The post contains one thesis and no generic hashtags.
</evidence>
<decisions>

# LinkedIn Post trade-off

Earn attention through a true tension, not through inflated certainty or manufactured controversy.
</decisions>
<assumptions>

# LinkedIn Post assumption

[SUPUESTO] `lengthRange` and the evidence needed for one or two-line hook are confirmed before compilation.
</assumptions>
<limits>

# LinkedIn Post boundary

A post cannot compress away the condition that makes its main claim accurate. Negative rules resolve at `/templates/9/negativePrompt`; authority remains in `CTRL-AUTHORITY-ROUTER-V3`.
</limits>
<edge_cases>

# LinkedIn Post edge case

If the hook promises a result the body cannot establish, rewrite the hook rather than stretch the evidence. Shared stop codes resolve through `CTRL-SYSTEM-PROMPT-V3`.
</edge_cases>
<acceptance>

# LinkedIn Post acceptance

- The first lines state a true tension.
- The post contains one thesis and no generic hashtags.
- Claims are traceable and conditions remain visible.
- CTA asks for one proportionate action.
</acceptance>

<related_documents>

# Dependencies

`CTRL-KNOWLEDGE-MAP-V3`; `CTRL-SYSTEM-PROMPT-V3`; `prompt.registry.v1/templates/9`.
</related_documents>
<change_log>

# Change log

- `2026-08-26` — LinkedIn Post v1.0 added to Canon v3.
  </change_log>
  </kb_document>
