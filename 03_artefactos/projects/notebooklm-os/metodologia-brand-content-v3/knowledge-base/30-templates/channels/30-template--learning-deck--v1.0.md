---
schema: 'knowledge-document-metadata-v1'
document_id: 'PROMPT-CHANNEL-LEARNING-DECK-V1'
title: 'Learning Deck Prompt Template'
version: '1.0'
status: 'ACTIVE'
authority: 'TEMPLATE'
layer: '30 Templates'
language: 'en'
response_locales: ['en', 'es-419']
routes: ['R40-CREATE']
tasks: ['create', 'brief', 'verify', 'learning-deck']
audiences: ['content strategist', 'editor', 'producer', 'verifier']
tags: ['notebooklm-os', 'canon-v3', 'prompt-template', 'channel', 'learning-deck']
keywords: ['learning-deck', 'Learning Deck', 'source selection', 'idempotency', 'acceptance']
aliases: ['Learning Deck']
source_refs: ['CTRL-SYSTEM-PROMPT-V3', 'CTRL-AUTHORITY-ROUTER-V3', 'prompt.registry.v1']
rights: 'APPROVED'
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: []
related_ids: ['CTRL-KNOWLEDGE-MAP-V3', 'CTRL-KB-STANDARD-V3']
manifest_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml'
json_registry_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/prompt-system/prompt-registry.json#/templates/14'
json_pointer: '/templates/14'
---

<kb_document>
<abstract>

# Abstract

Guide a learner from a meaningful question through explanation, practice, and transfer.
</abstract>
<navigation>

# Index

1. Learning Deck route
2. learnerProfile, learningObjectives, slideCount
3. learning question to transfer
4. Format boundary and verification
</navigation>

<routing>
# Learning Deck route

`R40-CREATE` selects 3-8 source IDs for learning-deck. Draft compilation requires no external mutation gate; `HUMAN_APPROVED` and publication remain separate promotions. Invalid breadth returns `BLOCKED_ALL_SOURCES`. Spanish output uses `es-419` without voseo.
</routing>
<knowledge>

# Learning Deck contract

Registry location: `/templates/14`.

## Distinct inputs

- `learnerProfile`
- `learningObjectives`
- `slideCount`

## Artifact sequence

1. learning question.
2. prior knowledge.
3. concept model.
4. worked example.
5. practice.
6. feedback.
7. transfer.

## Example

Example brief: teach source precedence in fourteen slides with a worked example, practice, feedback, and transfer.
</knowledge>
<evidence>

# Learning Deck evidence

[METODOLOGIA][source_ref:CTRL-AUTHORITY-ROUTER-V3] Evidence test: Practice aligns with instruction and acceptance.
</evidence>
<decisions>

# Learning Deck trade-off

Allocate visual attention to explanation and practice rather than maximizing content coverage.
</decisions>
<assumptions>

# Learning Deck assumption

[SUPUESTO] `slideCount` and the evidence needed for learning question are confirmed before compilation.
</assumptions>
<limits>

# Learning Deck boundary

A learning deck cannot claim mastery from exposure, completion, satisfaction, or one quiz score. Negative rules resolve at `/templates/14/negativePrompt`; authority remains in `CTRL-AUTHORITY-ROUTER-V3`.
</limits>
<edge_cases>

# Learning Deck edge case

When prior knowledge is unknown, include a diagnostic entry task and branch the facilitator guidance. Shared stop codes resolve through `CTRL-SYSTEM-PROMPT-V3`.
</edge_cases>
<acceptance>

# Learning Deck acceptance

- Objectives are observable and age-appropriate.
- Practice aligns with instruction and acceptance.
- Cognitive load is controlled per slide.
- Claims separate pedagogy, evidence, and metaphor.
</acceptance>

<related_documents>

# Dependencies

`CTRL-KNOWLEDGE-MAP-V3`; `CTRL-SYSTEM-PROMPT-V3`; `prompt.registry.v1/templates/14`.
</related_documents>
<change_log>

# Change log

- `2026-08-26` — Learning Deck v1.0 added to Canon v3.
  </change_log>
  </kb_document>
