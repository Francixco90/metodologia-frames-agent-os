---
schema: 'knowledge-document-metadata-v1'
document_id: 'PROMPT-CHANNEL-EXECUTIVE-DECK-V1'
title: 'Executive Deck Prompt Template'
version: '1.0'
status: 'ACTIVE'
authority: 'TEMPLATE'
layer: '30 Templates'
language: 'en'
response_locales: ['en', 'es-419']
routes: ['R40-CREATE']
tasks: ['create', 'brief', 'verify', 'executive-deck']
audiences: ['content strategist', 'editor', 'producer', 'verifier']
tags: ['notebooklm-os', 'canon-v3', 'prompt-template', 'channel', 'executive-deck']
keywords: ['executive-deck', 'Executive Deck', 'source selection', 'idempotency', 'acceptance']
aliases: ['Executive Deck']
source_refs: ['CTRL-SYSTEM-PROMPT-V3', 'CTRL-AUTHORITY-ROUTER-V3', 'prompt.registry.v1']
rights: 'APPROVED'
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: []
related_ids: ['CTRL-KNOWLEDGE-MAP-V3', 'CTRL-KB-STANDARD-V3']
manifest_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml'
json_registry_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/prompt-system/prompt-registry.json#/templates/12'
json_pointer: '/templates/12'
---

<kb_document>
<abstract>

# Abstract

Support an executive decision with a compact claim-evidence narrative.
</abstract>
<navigation>

# Index

1. Executive Deck route
2. slideCount, meetingDecision, deliveryMinutes
3. decision to next gate
4. Format boundary and verification
</navigation>

<routing>
# Executive Deck route

`R40-CREATE` selects 3-8 source IDs for executive-deck. Draft compilation requires no external mutation gate; `HUMAN_APPROVED` and publication remain separate promotions. Invalid breadth returns `BLOCKED_ALL_SOURCES`. Spanish output uses `es-419` without voseo.
</routing>
<knowledge>

# Executive Deck contract

Registry location: `/templates/12`.

## Distinct inputs

- `slideCount`
- `meetingDecision`
- `deliveryMinutes`

## Artifact sequence

1. decision.
2. stakes.
3. evidence.
4. options.
5. trade-offs.
6. recommendation.
7. next gate.

## Example

Example brief: prepare ten slides for a steering committee choosing between pilot, defer, and reject.
</knowledge>
<evidence>

# Executive Deck evidence

[METODOLOGIA][source_ref:CTRL-AUTHORITY-ROUTER-V3] Evidence test: Every strong claim has a source and condition.
</evidence>
<decisions>

# Executive Deck trade-off

Make options and trade-offs visible even when a single recommendation is preferred.
</decisions>
<assumptions>

# Executive Deck assumption

[SUPUESTO] `deliveryMinutes` and the evidence needed for decision are confirmed before compilation.
</assumptions>
<limits>

# Executive Deck boundary

An executive deck cannot present a weighted judgment as a scientific ranking without a validated method. Negative rules resolve at `/templates/12/negativePrompt`; authority remains in `CTRL-AUTHORITY-ROUTER-V3`.
</limits>
<edge_cases>

# Executive Deck edge case

If the meeting decision changes, invalidate the old idempotency key and compile a successor brief. Shared stop codes resolve through `CTRL-SYSTEM-PROMPT-V3`.
</edge_cases>
<acceptance>

# Executive Deck acceptance

- Requested slide count and meeting objective align.
- Every strong claim has a source and condition.
- Options and recommendation are visibly distinct.
- Speaker notes preserve provenance.
</acceptance>

<related_documents>

# Dependencies

`CTRL-KNOWLEDGE-MAP-V3`; `CTRL-SYSTEM-PROMPT-V3`; `prompt.registry.v1/templates/12`.
</related_documents>
<change_log>

# Change log

- `2026-08-26` — Executive Deck v1.0 added to Canon v3.
  </change_log>
  </kb_document>
