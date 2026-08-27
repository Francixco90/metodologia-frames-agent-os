---
schema: 'knowledge-document-metadata-v1'
document_id: 'PROMPT-CHANNEL-BRANDED-STATIC-VISUAL-V1'
title: 'Branded Static Visual Prompt Template'
version: '1.0'
status: 'ACTIVE'
authority: 'TEMPLATE'
layer: '30 Templates'
language: 'en'
response_locales: ['en', 'es-419']
routes: ['R40-CREATE']
tasks: ['create', 'brief', 'verify', 'branded-static-visual']
audiences: ['content strategist', 'editor', 'producer', 'verifier']
tags: ['notebooklm-os', 'canon-v3', 'prompt-template', 'channel', 'branded-static-visual']
keywords:
  [
    'branded-static-visual',
    'Branded Static Visual',
    'source selection',
    'idempotency',
    'acceptance',
  ]
aliases: ['Branded Static Visual']
source_refs: ['CTRL-SYSTEM-PROMPT-V3', 'CTRL-AUTHORITY-ROUTER-V3', 'prompt.registry.v1']
rights: 'APPROVED'
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: []
related_ids: ['CTRL-KNOWLEDGE-MAP-V3', 'CTRL-KB-STANDARD-V3']
manifest_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml'
json_registry_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/prompt-system/prompt-registry.json#/templates/21'
json_pointer: '/templates/21'
---

<kb_document>
<abstract>

# Abstract

Create a single branded visual that communicates one conclusion at a glance.
</abstract>
<navigation>

# Index

1. Branded Static Visual route
2. canvasRatio, displayContext
3. headline to reserved logo zone
4. Format boundary and verification
</navigation>

<routing>
# Branded Static Visual route

`R40-CREATE` selects 3-8 source IDs for branded-static-visual. Draft compilation requires no external mutation gate; `HUMAN_APPROVED` and publication remain separate promotions. Invalid breadth returns `BLOCKED_ALL_SOURCES`. Spanish output uses `es-419` without voseo.
</routing>
<knowledge>

# Branded Static Visual contract

Registry location: `/templates/21`.

## Distinct inputs

- `canvasRatio`
- `displayContext`

## Artifact sequence

1. headline.
2. one explanatory visual.
3. supporting line.
4. source or qualifier.
5. reserved logo zone.

## Example

Example brief: design a square visual around one method principle, one diagram, one qualifier, and a reserved logo zone.
</knowledge>
<evidence>

# Branded Static Visual evidence

[METODOLOGIA][source_ref:CTRL-AUTHORITY-ROUTER-V3] Evidence test: One conclusion dominates the composition.
</evidence>
<decisions>

# Branded Static Visual trade-off

Let one conclusion dominate; secondary decoration must never compete with meaning.
</decisions>
<assumptions>

# Branded Static Visual assumption

[SUPUESTO] `displayContext` and the evidence needed for headline are confirmed before compilation.
</assumptions>
<limits>

# Branded Static Visual boundary

A static visual cannot embed an invented logo, unapproved portrait, illegible source, or off-palette effect. Negative rules resolve at `/templates/21/negativePrompt`; authority remains in `CTRL-AUTHORITY-ROUTER-V3`.
</limits>
<edge_cases>

# Branded Static Visual edge case

If the message requires a sequence, route to carousel or infographic rather than crowding one canvas. Shared stop codes resolve through `CTRL-SYSTEM-PROMPT-V3`.
</edge_cases>
<acceptance>

# Branded Static Visual acceptance

- Message is legible at target display size.
- One conclusion dominates the composition.
- Logo uses an approved master in postproduction.
- Palette, typography, contrast, and safe zones pass review.
</acceptance>

<related_documents>

# Dependencies

`CTRL-KNOWLEDGE-MAP-V3`; `CTRL-SYSTEM-PROMPT-V3`; `prompt.registry.v1/templates/21`.
</related_documents>
<change_log>

# Change log

- `2026-08-26` — Branded Static Visual v1.0 added to Canon v3.
  </change_log>
  </kb_document>
