---
schema: 'knowledge-document-metadata-v1'
document_id: 'PROMPT-CHANNEL-COMMERCIAL-PROPOSAL-DECK-V1'
title: 'Commercial Proposal Deck Prompt Template'
version: '1.0'
status: 'ACTIVE'
authority: 'TEMPLATE'
layer: '30 Templates'
language: 'en'
response_locales: ['en', 'es-419']
routes: ['R40-CREATE']
tasks: ['create', 'brief', 'verify', 'commercial-proposal-deck']
audiences: ['content strategist', 'editor', 'producer', 'verifier']
tags: ['notebooklm-os', 'canon-v3', 'prompt-template', 'channel', 'commercial-proposal-deck']
keywords:
  [
    'commercial-proposal-deck',
    'Commercial Proposal Deck',
    'source selection',
    'idempotency',
    'acceptance',
  ]
aliases: ['Commercial Proposal Deck']
source_refs: ['CTRL-SYSTEM-PROMPT-V3', 'CTRL-AUTHORITY-ROUTER-V3', 'prompt.registry.v1']
rights: 'APPROVED'
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: []
related_ids: ['CTRL-KNOWLEDGE-MAP-V3', 'CTRL-KB-STANDARD-V3']
manifest_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml'
json_registry_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/prompt-system/prompt-registry.json#/templates/13'
json_pointer: '/templates/13'
---

<kb_document>
<abstract>

# Abstract

Frame a bounded offer around client context, value mechanism, delivery, and decisions.
</abstract>
<navigation>

# Index

1. Commercial Proposal Deck route
2. clientContext, offerScope, commercialStatus
3. client situation to next step
4. Format boundary and verification
</navigation>

<routing>
# Commercial Proposal Deck route

`R40-CREATE` selects 3-8 source IDs for commercial-proposal-deck. Draft compilation requires no external mutation gate; `HUMAN_APPROVED` and publication remain separate promotions. Invalid breadth returns `BLOCKED_ALL_SOURCES`. Spanish output uses `es-419` without voseo.
</routing>
<knowledge>

# Commercial Proposal Deck contract

Registry location: `/templates/13`.

## Distinct inputs

- `clientContext`
- `offerScope`
- `commercialStatus`

## Artifact sequence

1. client situation.
2. outcomes.
3. approach.
4. scope.
5. evidence.
6. risks.
7. commercial boundary.
8. next step.

## Example

Example brief: frame a discovery engagement with outcomes, work packages, exclusions, dependencies, and next gate.
</knowledge>
<evidence>

# Commercial Proposal Deck evidence

[METODOLOGIA][source_ref:CTRL-AUTHORITY-ROUTER-V3] Evidence test: Scope and exclusions are explicit.
</evidence>
<decisions>

# Commercial Proposal Deck trade-off

Connect value to a delivery mechanism while keeping commercial commitments explicitly bounded.
</decisions>
<assumptions>

# Commercial Proposal Deck assumption

[SUPUESTO] `commercialStatus` and the evidence needed for client situation are confirmed before compilation.
</assumptions>
<limits>

# Commercial Proposal Deck boundary

A proposal cannot invent client pain, internal capability, case evidence, ROI, price, or delivery authority. Negative rules resolve at `/templates/13/negativePrompt`; authority remains in `CTRL-AUTHORITY-ROUTER-V3`.
</limits>
<edge_cases>

# Commercial Proposal Deck edge case

If commercial approval is pending, mark figures and commitments as controlled placeholders, not final terms. Shared stop codes resolve through `CTRL-SYSTEM-PROMPT-V3`.
</edge_cases>
<acceptance>

# Commercial Proposal Deck acceptance

- No client fact, ROI, case, or commitment is invented.
- Scope and exclusions are explicit.
- Value claims describe mechanisms and evidence.
- Commercial approval remains a separate gate.
</acceptance>

<related_documents>

# Dependencies

`CTRL-KNOWLEDGE-MAP-V3`; `CTRL-SYSTEM-PROMPT-V3`; `prompt.registry.v1/templates/13`.
</related_documents>
<change_log>

# Change log

- `2026-08-26` — Commercial Proposal Deck v1.0 added to Canon v3.
  </change_log>
  </kb_document>
