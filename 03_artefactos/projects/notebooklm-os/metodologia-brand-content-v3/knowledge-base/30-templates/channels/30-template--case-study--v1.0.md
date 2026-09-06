---
schema: 'knowledge-document-metadata-v1'
document_id: 'PROMPT-CHANNEL-CASE-STUDY-V1'
title: 'Case Study Prompt Template'
version: '1.0'
status: 'ACTIVE'
authority: 'TEMPLATE'
layer: '30 Templates'
language: 'en'
response_locales: ['en', 'es-419']
routes: ['R40-CREATE']
tasks: ['create', 'brief', 'verify', 'case-study']
audiences: ['content strategist', 'editor', 'producer', 'verifier']
tags: ['notebooklm-os', 'canon-v3', 'prompt-template', 'channel', 'case-study']
keywords: ['case-study', 'Case Study', 'source selection', 'idempotency', 'acceptance']
aliases: ['Case Study']
source_refs: ['CTRL-SYSTEM-PROMPT-V3', 'CTRL-AUTHORITY-ROUTER-V3', 'prompt.registry.v1']
rights: 'APPROVED'
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: []
related_ids: ['CTRL-KNOWLEDGE-MAP-V3', 'CTRL-KB-STANDARD-V3']
manifest_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml'
json_registry_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/prompt-system/prompt-registry.json#/templates/20'
json_pointer: '/templates/20'
---

<kb_document>
<abstract>

# Abstract

Turn approved evidence into a credible narrative of context, intervention, and observed change.
</abstract>
<navigation>

# Index

1. Case Study route
2. caseEvidence, rightsStatus, measurementPeriod
3. context to transferable lesson
4. Format boundary and verification
</navigation>

<routing>
# Case Study route

`R40-CREATE` selects 3-8 source IDs for case-study. Draft compilation requires no external mutation gate; `HUMAN_APPROVED` and publication remain separate promotions. Invalid breadth returns `BLOCKED_ALL_SOURCES`. Spanish output uses `es-419` without voseo.
</routing>
<knowledge>

# Case Study contract

Registry location: `/templates/20`.

## Distinct inputs

- `caseEvidence`
- `rightsStatus`
- `measurementPeriod`

## Artifact sequence

1. context.
2. constraint.
3. approach.
4. implementation.
5. observed result.
6. limits.
7. transferable lesson.

## Example

Example brief: describe an approved pilot with baseline, intervention, observed result, limitations, and transferable lesson.
</knowledge>
<evidence>

# Case Study evidence

[METODOLOGIA][source_ref:CTRL-AUTHORITY-ROUTER-V3] Evidence test: Observed outcomes are not converted into causal guarantees.
</evidence>
<decisions>

# Case Study trade-off

Favor credible context and observed change over a simplified hero narrative.
</decisions>
<assumptions>

# Case Study assumption

[SUPUESTO] `measurementPeriod` and the evidence needed for context are confirmed before compilation.
</assumptions>
<limits>

# Case Study boundary

A case study cannot convert one observation into causation or expose a participant through indirect identifiers. Negative rules resolve at `/templates/20/negativePrompt`; authority remains in `CTRL-AUTHORITY-ROUTER-V3`.
</limits>
<edge_cases>

# Case Study edge case

If consent allows internal but not public use, produce a restricted learning note rather than publishable copy. Shared stop codes resolve through `CTRL-SYSTEM-PROMPT-V3`.
</edge_cases>
<acceptance>

# Case Study acceptance

- Consent and publication rights are confirmed.
- Observed outcomes are not converted into causal guarantees.
- Numbers retain units, period, and provenance.
- Anonymization does not create misleading specificity.
</acceptance>

<related_documents>

# Dependencies

`CTRL-KNOWLEDGE-MAP-V3`; `CTRL-SYSTEM-PROMPT-V3`; `prompt.registry.v1/templates/20`.
</related_documents>
<change_log>

# Change log

- `2026-08-26` — Case Study v1.0 added to Canon v3.
  </change_log>
  </kb_document>
