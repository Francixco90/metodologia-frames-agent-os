---
schema: 'knowledge-document-metadata-v1'
document_id: 'PROMPT-STUDIO-QUIZ-V1'
title: 'Quiz Prompt Template'
version: '1.0'
status: 'ACTIVE'
authority: 'TEMPLATE'
layer: '30 Templates'
language: 'en'
response_locales: ['en', 'es-419']
routes: ['R70-STUDIO']
tasks: ['create', 'brief', 'verify', 'quiz']
audiences: ['content strategist', 'editor', 'producer', 'verifier']
tags: ['notebooklm-os', 'canon-v3', 'prompt-template', 'studio', 'quiz']
keywords: ['quiz', 'Quiz', 'source selection', 'idempotency', 'acceptance']
aliases: ['Quiz']
source_refs: ['CTRL-SYSTEM-PROMPT-V3', 'CTRL-AUTHORITY-ROUTER-V3', 'prompt.registry.v1']
rights: 'APPROVED'
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: []
related_ids: ['CTRL-KNOWLEDGE-MAP-V3', 'CTRL-KB-STANDARD-V3']
manifest_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml'
json_registry_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/prompt-system/prompt-registry.json#/templates/6'
json_pointer: '/templates/6'
---

<kb_document>
<abstract>

# Abstract

Assess understanding and transfer with answerable, discriminating questions.
</abstract>
<navigation>

# Index

1. Quiz route
2. questionCount, learningObjectives, passingThreshold
3. instructions to scoring guidance
4. Format boundary and verification
</navigation>

<routing>
# Quiz route

`R70-STUDIO` selects 4-12 source IDs for quiz. `NLM_STUDIO_GENERATION_APPROVED` governs generation. Invalid breadth returns `BLOCKED_ALL_SOURCES`. Spanish output uses `es-419` without voseo.
</routing>
<knowledge>

# Quiz contract

Registry location: `/templates/6`.

## Distinct inputs

- `questionCount`
- `learningObjectives`
- `passingThreshold`

## Artifact sequence

1. instructions.
2. questions.
3. answer key.
4. rationales.
5. scoring guidance.

## Example

Example brief: create ten scenario questions with rationales and an eighty-percent passing threshold.
</knowledge>
<evidence>

# Quiz evidence

[METODOLOGIA][source_ref:CTRL-AUTHORITY-ROUTER-V3] Evidence test: Distractors are plausible but not deceptive.
</evidence>
<decisions>

# Quiz trade-off

Measure transfer rather than rewarding superficial phrase matching.
</decisions>
<assumptions>

# Quiz assumption

[SUPUESTO] `passingThreshold` and the evidence needed for instructions are confirmed before compilation.
</assumptions>
<limits>

# Quiz boundary

A quiz score is not proof of durable learning, real-world performance, or instructional quality. Negative rules resolve at `/templates/6/negativePrompt`; authority remains in `CTRL-AUTHORITY-ROUTER-V3`.
</limits>
<edge_cases>

# Quiz edge case

If evidence supports more than one answer, rewrite the item instead of choosing an arbitrary key. Shared stop codes resolve through `CTRL-SYSTEM-PROMPT-V3`.
</edge_cases>
<acceptance>

# Quiz acceptance

- Every item maps to a learning objective and selected source.
- Distractors are plausible but not deceptive.
- Answers and rationales are unambiguous.
- Passing threshold is declared before generation.
</acceptance>

<related_documents>

# Dependencies

`CTRL-KNOWLEDGE-MAP-V3`; `CTRL-SYSTEM-PROMPT-V3`; `prompt.registry.v1/templates/6`.
</related_documents>
<change_log>

# Change log

- `2026-08-26` — Quiz v1.0 added to Canon v3.
  </change_log>
  </kb_document>
