---
schema: 'knowledge-document-metadata-v1'
document_id: 'PROMPT-CHANNEL-EMAIL-V1'
title: 'Email Prompt Template'
version: '1.0'
status: 'ACTIVE'
authority: 'TEMPLATE'
layer: '30 Templates'
language: 'en'
response_locales: ['en', 'es-419']
routes: ['R40-CREATE']
tasks: ['create', 'brief', 'verify', 'email']
audiences: ['content strategist', 'editor', 'producer', 'verifier']
tags: ['notebooklm-os', 'canon-v3', 'prompt-template', 'channel', 'email']
keywords: ['email', 'Email', 'source selection', 'idempotency', 'acceptance']
aliases: ['Email']
source_refs: ['CTRL-SYSTEM-PROMPT-V3', 'CTRL-AUTHORITY-ROUTER-V3', 'prompt.registry.v1']
rights: 'APPROVED'
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: []
related_ids: ['CTRL-KNOWLEDGE-MAP-V3', 'CTRL-KB-STANDARD-V3']
manifest_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml'
json_registry_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/prompt-system/prompt-registry.json#/templates/18'
json_pointer: '/templates/18'
---

<kb_document>
<abstract>

# Abstract

Move one relationship or decision forward with concise, respectful context.
</abstract>
<navigation>

# Index

1. Email route
2. recipientRole, relationshipContext, emailIntent
3. subject to sign-off
4. Format boundary and verification
</navigation>

<routing>
# Email route

`R40-CREATE` selects 3-8 source IDs for email. Draft compilation requires no external mutation gate; `HUMAN_APPROVED` and publication remain separate promotions. Invalid breadth returns `BLOCKED_ALL_SOURCES`. Spanish output uses `es-419` without voseo.
</routing>
<knowledge>

# Email contract

Registry location: `/templates/18`.

## Distinct inputs

- `recipientRole`
- `relationshipContext`
- `emailIntent`

## Artifact sequence

1. subject.
2. opening context.
3. single ask or update.
4. necessary evidence.
5. next step.
6. sign-off.

## Example

Example brief: ask a reviewer to approve one exact artifact version, naming evidence, deadline, and next gate.
</knowledge>
<evidence>

# Email evidence

[METODOLOGIA][source_ref:CTRL-AUTHORITY-ROUTER-V3] Evidence test: The email makes one primary request.
</evidence>
<decisions>

# Email trade-off

Preserve necessary context while making one primary request easy to answer.
</decisions>
<assumptions>

# Email assumption

[SUPUESTO] `emailIntent` and the evidence needed for subject are confirmed before compilation.
</assumptions>
<limits>

# Email boundary

An email cannot disclose restricted evidence or make commitments beyond the sender's authority. Negative rules resolve at `/templates/18/negativePrompt`; authority remains in `CTRL-AUTHORITY-ROUTER-V3`.
</limits>
<edge_cases>

# Email edge case

If information and approval are both needed, state the approval as the primary ask and list information as support. Shared stop codes resolve through `CTRL-SYSTEM-PROMPT-V3`.
</edge_cases>
<acceptance>

# Email acceptance

- Purpose is clear in the first paragraph.
- The email makes one primary request.
- Tone matches the relationship and language.
- No sensitive data or unapproved commitment appears.
</acceptance>

<related_documents>

# Dependencies

`CTRL-KNOWLEDGE-MAP-V3`; `CTRL-SYSTEM-PROMPT-V3`; `prompt.registry.v1/templates/18`.
</related_documents>
<change_log>

# Change log

- `2026-08-26` — Email v1.0 added to Canon v3.
  </change_log>
  </kb_document>
