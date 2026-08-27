---
schema: 'knowledge-document-metadata-v1'
document_id: 'PROMPT-STUDIO-MIND-MAP-V1'
title: 'Mind Map Prompt Template'
version: '1.0'
status: 'ACTIVE'
authority: 'TEMPLATE'
layer: '30 Templates'
language: 'en'
response_locales: ['en', 'es-419']
routes: ['R70-STUDIO']
tasks: ['create', 'brief', 'verify', 'mind-map']
audiences: ['content strategist', 'editor', 'producer', 'verifier']
tags: ['notebooklm-os', 'canon-v3', 'prompt-template', 'studio', 'mind-map']
keywords: ['mind-map', 'Mind Map', 'source selection', 'idempotency', 'acceptance']
aliases: ['Mind Map']
source_refs: ['CTRL-SYSTEM-PROMPT-V3', 'CTRL-AUTHORITY-ROUTER-V3', 'prompt.registry.v1']
rights: 'APPROVED'
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: []
related_ids: ['CTRL-KNOWLEDGE-MAP-V3', 'CTRL-KB-STANDARD-V3']
manifest_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml'
json_registry_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/prompt-system/prompt-registry.json#/templates/8'
json_pointer: '/templates/8'
---

<kb_document>
<abstract>

# Abstract

Expose relationships, hierarchy, and open questions around a bounded topic.
</abstract>
<navigation>

# Index

1. Mind Map route
2. centralQuestion, depthLimit
3. central thesis to gaps
4. Format boundary and verification
</navigation>

<routing>
# Mind Map route

`R70-STUDIO` selects 4-12 source IDs for mind-map. `NLM_STUDIO_GENERATION_APPROVED` governs generation. Invalid breadth returns `BLOCKED_ALL_SOURCES`. Spanish output uses `es-419` without voseo.
</routing>
<knowledge>

# Mind Map contract

Registry location: `/templates/8`.

## Distinct inputs

- `centralQuestion`
- `depthLimit`

## Artifact sequence

1. central thesis.
2. primary branches.
3. supporting nodes.
4. cross-links.
5. gaps.

## Example

Example brief: map one central question into four branches, two levels, and a visible cluster of unknowns.
</knowledge>
<evidence>

# Mind Map evidence

[METODOLOGIA][source_ref:CTRL-AUTHORITY-ROUTER-V3] Evidence test: Relationships reflect selected sources rather than association alone.
</evidence>
<decisions>

# Mind Map trade-off

Reveal a useful hierarchy without pretending every relationship is causal.
</decisions>
<assumptions>

# Mind Map assumption

[SUPUESTO] `depthLimit` and the evidence needed for central thesis are confirmed before compilation.
</assumptions>
<limits>

# Mind Map boundary

A mind map cannot replace a sequence diagram when timing, direction, or state transition is decisive. Negative rules resolve at `/templates/8/negativePrompt`; authority remains in `CTRL-AUTHORITY-ROUTER-V3`.
</limits>
<edge_cases>

# Mind Map edge case

If a node belongs under several branches, use a labeled cross-link and avoid duplicating its claim. Shared stop codes resolve through `CTRL-SYSTEM-PROMPT-V3`.
</edge_cases>
<acceptance>

# Mind Map acceptance

- Hierarchy is readable and non-redundant.
- Relationships reflect selected sources rather than association alone.
- Unknowns are visibly separated from claims.
- The artifact remains legible at normal zoom.
</acceptance>

<related_documents>

# Dependencies

`CTRL-KNOWLEDGE-MAP-V3`; `CTRL-SYSTEM-PROMPT-V3`; `prompt.registry.v1/templates/8`.
</related_documents>
<change_log>

# Change log

- `2026-08-26` — Mind Map v1.0 added to Canon v3.
  </change_log>
  </kb_document>
