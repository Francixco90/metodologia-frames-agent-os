---
schema: 'knowledge-document-metadata-v1'
document_id: 'PROMPT-CHANNEL-LINKEDIN-CAROUSEL-V1'
title: 'LinkedIn Carousel Prompt Template'
version: '1.0'
status: 'ACTIVE'
authority: 'TEMPLATE'
layer: '30 Templates'
language: 'en'
response_locales: ['en', 'es-419']
routes: ['R40-CREATE']
tasks: ['create', 'brief', 'verify', 'linkedin-carousel']
audiences: ['content strategist', 'editor', 'producer', 'verifier']
tags: ['notebooklm-os', 'canon-v3', 'prompt-template', 'channel', 'linkedin-carousel']
keywords:
  ['linkedin-carousel', 'LinkedIn Carousel', 'source selection', 'idempotency', 'acceptance']
aliases: ['LinkedIn Carousel', 'Linkedin Carousel']
source_refs: ['CTRL-SYSTEM-PROMPT-V3', 'CTRL-AUTHORITY-ROUTER-V3', 'prompt.registry.v1']
rights: 'APPROVED'
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: []
related_ids: ['CTRL-KNOWLEDGE-MAP-V3', 'CTRL-KB-STANDARD-V3']
manifest_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml'
json_registry_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/prompt-system/prompt-registry.json#/templates/10'
json_pointer: '/templates/10'
---

<kb_document>
<abstract>

# Abstract

Translate one argument into a swipeable sequence with a deliberate information rhythm.
</abstract>
<navigation>

# Index

1. LinkedIn Carousel route
2. cardCount, canvasRatio
3. cover conclusion to closing CTA
4. Format boundary and verification
</navigation>

<routing>
# LinkedIn Carousel route

`R40-CREATE` selects 3-8 source IDs for linkedin-carousel. Draft compilation requires no external mutation gate; `HUMAN_APPROVED` and publication remain separate promotions. Invalid breadth returns `BLOCKED_ALL_SOURCES`. Spanish output uses `es-419` without voseo.
</routing>
<knowledge>

# LinkedIn Carousel contract

Registry location: `/templates/10`.

## Distinct inputs

- `cardCount`
- `canvasRatio`

## Artifact sequence

1. cover conclusion.
2. problem.
3. reframe.
4. evidence sequence.
5. application.
6. closing CTA.

## Example

Example brief: create eight cards that move from a mistaken assumption to a practical three-step method.
</knowledge>
<evidence>

# LinkedIn Carousel evidence

[METODOLOGIA][source_ref:CTRL-AUTHORITY-ROUTER-V3] Evidence test: Each card carries one idea and readable copy.
</evidence>
<decisions>

# LinkedIn Carousel trade-off

Use card-to-card progression instead of splitting a long paragraph into decorative panels.
</decisions>
<assumptions>

# LinkedIn Carousel assumption

[SUPUESTO] `canvasRatio` and the evidence needed for cover conclusion are confirmed before compilation.
</assumptions>
<limits>

# LinkedIn Carousel boundary

A carousel cannot rely on captions to repair an incomplete narrative or inaccessible card design. Negative rules resolve at `/templates/10/negativePrompt`; authority remains in `CTRL-AUTHORITY-ROUTER-V3`.
</limits>
<edge_cases>

# LinkedIn Carousel edge case

If one card needs two conclusions, divide or remove content while preserving the fixed card count. Shared stop codes resolve through `CTRL-SYSTEM-PROMPT-V3`.
</edge_cases>
<acceptance>

# LinkedIn Carousel acceptance

- Card count matches the brief.
- Each card carries one idea and readable copy.
- Narrative works without speaker notes.
- Visual system and safe zones are consistent.
</acceptance>

<related_documents>

# Dependencies

`CTRL-KNOWLEDGE-MAP-V3`; `CTRL-SYSTEM-PROMPT-V3`; `prompt.registry.v1/templates/10`.
</related_documents>
<change_log>

# Change log

- `2026-08-26` — LinkedIn Carousel v1.0 added to Canon v3.
  </change_log>
  </kb_document>
