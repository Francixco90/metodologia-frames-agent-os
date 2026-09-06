---
schema: 'knowledge-document-metadata-v1'
document_id: 'PROMPT-STUDIO-DATA-TABLE-V1'
title: 'Data Table Prompt Template'
version: '1.0'
status: 'ACTIVE'
authority: 'TEMPLATE'
layer: '30 Templates'
language: 'en'
response_locales: ['en', 'es-419']
routes: ['R70-STUDIO']
tasks: ['create', 'brief', 'verify', 'data-table']
audiences: ['content strategist', 'editor', 'producer', 'verifier']
tags: ['notebooklm-os', 'canon-v3', 'prompt-template', 'studio', 'data-table']
keywords: ['data-table', 'Data Table', 'source selection', 'idempotency', 'acceptance']
aliases: ['Data Table']
source_refs: ['CTRL-SYSTEM-PROMPT-V3', 'CTRL-AUTHORITY-ROUTER-V3', 'prompt.registry.v1']
rights: 'APPROVED'
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: []
related_ids: ['CTRL-KNOWLEDGE-MAP-V3', 'CTRL-KB-STANDARD-V3']
manifest_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml'
json_registry_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/prompt-system/prompt-registry.json#/templates/7'
json_pointer: '/templates/7'
---

<kb_document>
<abstract>

# Abstract

Normalize source-grounded facts into a comparison-ready table without false precision.
</abstract>
<navigation>

# Index

1. Data Table route
2. rowUnit, columnSchema, missingValuePolicy
3. field definitions to limitations
4. Format boundary and verification
</navigation>

<routing>
# Data Table route

`R70-STUDIO` selects 4-12 source IDs for data-table. `NLM_STUDIO_GENERATION_APPROVED` governs generation. Invalid breadth returns `BLOCKED_ALL_SOURCES`. Spanish output uses `es-419` without voseo.
</routing>
<knowledge>

# Data Table contract

Registry location: `/templates/7`.

## Distinct inputs

- `rowUnit`
- `columnSchema`
- `missingValuePolicy`

## Artifact sequence

1. field definitions.
2. rows.
3. source and date columns.
4. missing-value legend.
5. limitations.

## Example

Example brief: normalize five tools across six dated criteria, with source and N/E columns on every row.
</knowledge>
<evidence>

# Data Table evidence

[METODOLOGIA][source_ref:CTRL-AUTHORITY-ROUTER-V3] Evidence test: Units and dates are normalized.
</evidence>
<decisions>

# Data Table trade-off

Prefer comparable fields and visible missingness over a dense table with false precision.
</decisions>
<assumptions>

# Data Table assumption

[SUPUESTO] `missingValuePolicy` and the evidence needed for field definitions are confirmed before compilation.
</assumptions>
<limits>

# Data Table boundary

The table cannot infer absent values or normalize incompatible units without documenting a method. Negative rules resolve at `/templates/7/negativePrompt`; authority remains in `CTRL-AUTHORITY-ROUTER-V3`.
</limits>
<edge_cases>

# Data Table edge case

When a row belongs to multiple categories, use explicit multi-value fields instead of silently choosing one. Shared stop codes resolve through `CTRL-SYSTEM-PROMPT-V3`.
</edge_cases>
<acceptance>

# Data Table acceptance

- Every row has provenance or an explicit N/E marker.
- Units and dates are normalized.
- Missing data is not inferred.
- Exported columns match the declared schema.
</acceptance>

<related_documents>

# Dependencies

`CTRL-KNOWLEDGE-MAP-V3`; `CTRL-SYSTEM-PROMPT-V3`; `prompt.registry.v1/templates/7`.
</related_documents>
<change_log>

# Change log

- `2026-08-26` — Data Table v1.0 added to Canon v3.
  </change_log>
  </kb_document>
