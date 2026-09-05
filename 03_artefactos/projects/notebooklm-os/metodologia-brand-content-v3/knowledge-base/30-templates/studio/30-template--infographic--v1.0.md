---
schema: 'knowledge-document-metadata-v1'
document_id: 'PROMPT-STUDIO-INFOGRAPHIC-V1'
title: 'Infographic Prompt Template'
version: '1.0'
status: 'ACTIVE'
authority: 'TEMPLATE'
layer: '30 Templates'
language: 'en'
response_locales: ['en', 'es-419']
routes: ['R70-STUDIO']
tasks: ['create', 'brief', 'verify', 'infographic']
audiences: ['content strategist', 'editor', 'producer', 'verifier']
tags: ['notebooklm-os', 'canon-v3', 'prompt-template', 'studio', 'infographic']
keywords: ['infographic', 'Infographic', 'source selection', 'idempotency', 'acceptance']
aliases: ['Infographic']
source_refs: ['CTRL-SYSTEM-PROMPT-V3', 'CTRL-AUTHORITY-ROUTER-V3', 'prompt.registry.v1']
rights: 'APPROVED'
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: []
related_ids: ['CTRL-KNOWLEDGE-MAP-V3', 'CTRL-KB-STANDARD-V3']
manifest_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml'
json_registry_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/prompt-system/prompt-registry.json#/templates/2'
json_pointer: '/templates/2'
---

<kb_document>
<abstract>

# Abstract

Compress a defensible idea into a scan-friendly explanatory visual.
</abstract>
<navigation>

# Index

1. Infographic route
2. canvasRatio, readingContext
3. conclusion title to source footer
4. Format boundary and verification
</navigation>

<routing>
# Infographic route

`R70-STUDIO` selects 4-12 source IDs for infographic. `NLM_STUDIO_GENERATION_APPROVED` governs generation. Invalid breadth returns `BLOCKED_ALL_SOURCES`. Spanish output uses `es-419` without voseo.
</routing>
<knowledge>

# Infographic contract

Registry location: `/templates/2`.

## Distinct inputs

- `canvasRatio`
- `readingContext`

## Artifact sequence

1. conclusion title.
2. orientation cue.
3. three to five evidence blocks.
4. limit.
5. source footer.

## Example

Example brief: compare three source roles in a vertical canvas using five evidence blocks and one explicit gap.
</knowledge>
<evidence>

# Infographic evidence

[METODOLOGIA][source_ref:CTRL-AUTHORITY-ROUTER-V3] Evidence test: Visible text is concise and factually supported.
</evidence>
<decisions>

# Infographic trade-off

Trade completeness for scanability while retaining every qualifier that changes the conclusion.
</decisions>
<assumptions>

# Infographic assumption

[SUPUESTO] `readingContext` and the evidence needed for conclusion title are confirmed before compilation.
</assumptions>
<limits>

# Infographic boundary

An infographic cannot represent uncertainty only through tiny footnotes or color alone. Negative rules resolve at `/templates/2/negativePrompt`; authority remains in `CTRL-AUTHORITY-ROUTER-V3`.
</limits>
<edge_cases>

# Infographic edge case

If categories overlap, state the organizing rule or switch from comparison to a process diagram. Shared stop codes resolve through `CTRL-SYSTEM-PROMPT-V3`.
</edge_cases>
<acceptance>

# Infographic acceptance

- Reading order is unambiguous at target size.
- Visible text is concise and factually supported.
- Contrast and hierarchy pass accessibility review.
- Downloaded bytes match the requested visual type.
</acceptance>

<related_documents>

# Dependencies

`CTRL-KNOWLEDGE-MAP-V3`; `CTRL-SYSTEM-PROMPT-V3`; `prompt.registry.v1/templates/2`.
</related_documents>
<change_log>

# Change log

- `2026-08-26` — Infographic v1.0 added to Canon v3.
  </change_log>
  </kb_document>
