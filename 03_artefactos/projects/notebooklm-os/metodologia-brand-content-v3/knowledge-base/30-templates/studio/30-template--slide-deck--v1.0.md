---
schema: 'knowledge-document-metadata-v1'
document_id: 'PROMPT-STUDIO-SLIDE-DECK-V1'
title: 'Slide Deck Prompt Template'
version: '1.0'
status: 'ACTIVE'
authority: 'TEMPLATE'
layer: '30 Templates'
language: 'en'
response_locales: ['en', 'es-419']
routes: ['R70-STUDIO']
tasks: ['create', 'brief', 'verify', 'slide-deck']
audiences: ['content strategist', 'editor', 'producer', 'verifier']
tags: ['notebooklm-os', 'canon-v3', 'prompt-template', 'studio', 'slide-deck']
keywords: ['slide-deck', 'Slide Deck', 'source selection', 'idempotency', 'acceptance']
aliases: ['Slide Deck']
source_refs: ['CTRL-SYSTEM-PROMPT-V3', 'CTRL-AUTHORITY-ROUTER-V3', 'prompt.registry.v1']
rights: 'APPROVED'
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: []
related_ids: ['CTRL-KNOWLEDGE-MAP-V3', 'CTRL-KB-STANDARD-V3']
manifest_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml'
json_registry_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/prompt-system/prompt-registry.json#/templates/3'
json_pointer: '/templates/3'
---

<kb_document>
<abstract>

# Abstract

Build a narrative sequence for a live or asynchronous decision-making presentation.
</abstract>
<navigation>

# Index

1. Slide Deck route
2. slideCount, aspectRatio, deliveryMinutes
3. tension to next step
4. Format boundary and verification
</navigation>

<routing>
# Slide Deck route

`R70-STUDIO` selects 4-12 source IDs for slide-deck. `NLM_STUDIO_GENERATION_APPROVED` governs generation. Invalid breadth returns `BLOCKED_ALL_SOURCES`. Spanish output uses `es-419` without voseo.
</routing>
<knowledge>

# Slide Deck contract

Registry location: `/templates/3`.

## Distinct inputs

- `slideCount`
- `aspectRatio`
- `deliveryMinutes`

## Artifact sequence

1. tension.
2. thesis.
3. evidence arc.
4. decision.
5. next step.

## Example

Example brief: build twelve 16:9 slides that move executives from problem to decision in fifteen minutes.
</knowledge>
<evidence>

# Slide Deck evidence

[METODOLOGIA][source_ref:CTRL-AUTHORITY-ROUTER-V3] Evidence test: Each slide has one conclusion and no unsupported claim.
</evidence>
<decisions>

# Slide Deck trade-off

Narrative progression outranks fitting every source fact onto a slide.
</decisions>
<assumptions>

# Slide Deck assumption

[SUPUESTO] `deliveryMinutes` and the evidence needed for tension are confirmed before compilation.
</assumptions>
<limits>

# Slide Deck boundary

Studio output cannot satisfy editability or accessibility merely because its PDF looks correct. Negative rules resolve at `/templates/3/negativePrompt`; authority remains in `CTRL-AUTHORITY-ROUTER-V3`.
</limits>
<edge_cases>

# Slide Deck edge case

If the requested count cannot hold the argument, surface the conflict before generation; never add hidden slides. Shared stop codes resolve through `CTRL-SYSTEM-PROMPT-V3`.
</edge_cases>
<acceptance>

# Slide Deck acceptance

- Slide count and ratio match the brief exactly.
- Each slide has one conclusion and no unsupported claim.
- Speaker notes retain evidence and conditions.
- Rasterized output is labeled STUDIO_RAW until editable postproduction.
</acceptance>

<related_documents>

# Dependencies

`CTRL-KNOWLEDGE-MAP-V3`; `CTRL-SYSTEM-PROMPT-V3`; `prompt.registry.v1/templates/3`.
</related_documents>
<change_log>

# Change log

- `2026-08-26` — Slide Deck v1.0 added to Canon v3.
  </change_log>
  </kb_document>
