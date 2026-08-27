---
schema: 'knowledge-document-metadata-v1'
document_id: 'PROMPT-CHANNEL-ONE-PAGER-V1'
title: 'One-pager Prompt Template'
version: '1.0'
status: 'ACTIVE'
authority: 'TEMPLATE'
layer: '30 Templates'
language: 'en'
response_locales: ['en', 'es-419']
routes: ['R40-CREATE']
tasks: ['create', 'brief', 'verify', 'one-pager']
audiences: ['content strategist', 'editor', 'producer', 'verifier']
tags: ['notebooklm-os', 'canon-v3', 'prompt-template', 'channel', 'one-pager']
keywords: ['one-pager', 'One-pager', 'source selection', 'idempotency', 'acceptance']
aliases: ['One-pager', 'One Pager']
source_refs: ['CTRL-SYSTEM-PROMPT-V3', 'CTRL-AUTHORITY-ROUTER-V3', 'prompt.registry.v1']
rights: 'APPROVED'
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: []
related_ids: ['CTRL-KNOWLEDGE-MAP-V3', 'CTRL-KB-STANDARD-V3']
manifest_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml'
json_registry_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/prompt-system/prompt-registry.json#/templates/11'
json_pointer: '/templates/11'
---

<kb_document>
<abstract>

# Abstract

Help a time-constrained reader understand a proposition and choose a next step.
</abstract>
<navigation>

# Index

1. One-pager route
2. pageSize, readerDecision
3. decision headline to next step
4. Format boundary and verification
</navigation>

<routing>
# One-pager route

`R40-CREATE` selects 3-8 source IDs for one-pager. Draft compilation requires no external mutation gate; `HUMAN_APPROVED` and publication remain separate promotions. Invalid breadth returns `BLOCKED_ALL_SOURCES`. Spanish output uses `es-419` without voseo.
</routing>
<knowledge>

# One-pager contract

Registry location: `/templates/11`.

## Distinct inputs

- `pageSize`
- `readerDecision`

## Artifact sequence

1. decision headline.
2. audience and problem.
3. method.
4. evidence.
5. limits.
6. next step.

## Example

Example brief: explain an internal pilot to a sponsor with scope, evidence, risks, and one approval request.
</knowledge>
<evidence>

# One-pager evidence

[METODOLOGIA][source_ref:CTRL-AUTHORITY-ROUTER-V3] Evidence test: Benefits are evidence-bound rather than promised.
</evidence>
<decisions>

# One-pager trade-off

Optimize for a two-minute decision, not for comprehensive organizational documentation.
</decisions>
<assumptions>

# One-pager assumption

[SUPUESTO] `readerDecision` and the evidence needed for decision headline are confirmed before compilation.
</assumptions>
<limits>

# One-pager boundary

A one-pager cannot hide exclusions, decision ownership, or material evidence in unreadable fine print. Negative rules resolve at `/templates/11/negativePrompt`; authority remains in `CTRL-AUTHORITY-ROUTER-V3`.
</limits>
<edge_cases>

# One-pager edge case

If two audiences need different decisions, create separate successors instead of averaging their needs. Shared stop codes resolve through `CTRL-SYSTEM-PROMPT-V3`.
</edge_cases>
<acceptance>

# One-pager acceptance

- The decision is understandable in under two minutes.
- Benefits are evidence-bound rather than promised.
- Sections are scannable and non-repetitive.
- A single accountable next step is present.
</acceptance>

<related_documents>

# Dependencies

`CTRL-KNOWLEDGE-MAP-V3`; `CTRL-SYSTEM-PROMPT-V3`; `prompt.registry.v1/templates/11`.
</related_documents>
<change_log>

# Change log

- `2026-08-26` — One-pager v1.0 added to Canon v3.
  </change_log>
  </kb_document>
