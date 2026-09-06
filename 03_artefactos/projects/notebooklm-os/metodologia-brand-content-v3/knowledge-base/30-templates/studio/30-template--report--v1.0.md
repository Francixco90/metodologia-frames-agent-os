---
schema: 'knowledge-document-metadata-v1'
document_id: 'PROMPT-STUDIO-REPORT-V1'
title: 'Report Prompt Template'
version: '1.0'
status: 'ACTIVE'
authority: 'TEMPLATE'
layer: '30 Templates'
language: 'en'
response_locales: ['en', 'es-419']
routes: ['R70-STUDIO']
tasks: ['create', 'brief', 'verify', 'report']
audiences: ['content strategist', 'editor', 'producer', 'verifier']
tags: ['notebooklm-os', 'canon-v3', 'prompt-template', 'studio', 'report']
keywords: ['report', 'Report', 'source selection', 'idempotency', 'acceptance']
aliases: ['Report']
source_refs: ['CTRL-SYSTEM-PROMPT-V3', 'CTRL-AUTHORITY-ROUTER-V3', 'prompt.registry.v1']
rights: 'APPROVED'
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: []
related_ids: ['CTRL-KNOWLEDGE-MAP-V3', 'CTRL-KB-STANDARD-V3']
manifest_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml'
json_registry_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/prompt-system/prompt-registry.json#/templates/4'
json_pointer: '/templates/4'
---

<kb_document>
<abstract>

# Abstract

Synthesize evidence into a structured decision document with explicit uncertainty.
</abstract>
<navigation>

# Index

1. Report route
2. decisionQuestion, cutoffDate
3. executive conclusion to gaps
4. Format boundary and verification
</navigation>

<routing>
# Report route

`R70-STUDIO` selects 4-12 source IDs for report. `NLM_STUDIO_GENERATION_APPROVED` governs generation. Invalid breadth returns `BLOCKED_ALL_SOURCES`. Spanish output uses `es-419` without voseo.
</routing>
<knowledge>

# Report contract

Registry location: `/templates/4`.

## Distinct inputs

- `decisionQuestion`
- `cutoffDate`

## Artifact sequence

1. executive conclusion.
2. scope and method.
3. findings.
4. trade-offs.
5. recommendations.
6. gaps.

## Example

Example brief: answer one investment question with a dated evidence table, two options, and unresolved gaps.
</knowledge>
<evidence>

# Report evidence

[METODOLOGIA][source_ref:CTRL-AUTHORITY-ROUTER-V3] Evidence test: Recommendations are conditioned by the findings.
</evidence>
<decisions>

# Report trade-off

Preserve decision-relevant nuance even when it makes the recommendation conditional.
</decisions>
<assumptions>

# Report assumption

[SUPUESTO] `cutoffDate` and the evidence needed for executive conclusion are confirmed before compilation.
</assumptions>
<limits>

# Report boundary

A report cannot transform missing evaluation, correlation, or vendor language into demonstrated fact. Negative rules resolve at `/templates/4/negativePrompt`; authority remains in `CTRL-AUTHORITY-ROUTER-V3`.
</limits>
<edge_cases>

# Report edge case

When sources use incompatible dates or definitions, compare them in separate frames and document the mismatch. Shared stop codes resolve through `CTRL-SYSTEM-PROMPT-V3`.
</edge_cases>
<acceptance>

# Report acceptance

- Scope, cutoff date, evidence, and uncertainty are explicit.
- Recommendations are conditioned by the findings.
- Citations resolve to selected sources.
- Downloaded document is reread before verification.
</acceptance>

<related_documents>

# Dependencies

`CTRL-KNOWLEDGE-MAP-V3`; `CTRL-SYSTEM-PROMPT-V3`; `prompt.registry.v1/templates/4`.
</related_documents>
<change_log>

# Change log

- `2026-08-26` — Report v1.0 added to Canon v3.
  </change_log>
  </kb_document>
