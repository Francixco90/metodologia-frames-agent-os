---
schema: 'knowledge-document-metadata-v1'
document_id: 'PROMPT-STUDIO-FLASHCARDS-V1'
title: 'Flashcards Prompt Template'
version: '1.0'
status: 'ACTIVE'
authority: 'TEMPLATE'
layer: '30 Templates'
language: 'en'
response_locales: ['en', 'es-419']
routes: ['R70-STUDIO']
tasks: ['create', 'brief', 'verify', 'flashcards']
audiences: ['content strategist', 'editor', 'producer', 'verifier']
tags: ['notebooklm-os', 'canon-v3', 'prompt-template', 'studio', 'flashcards']
keywords: ['flashcards', 'Flashcards', 'source selection', 'idempotency', 'acceptance']
aliases: ['Flashcards']
source_refs: ['CTRL-SYSTEM-PROMPT-V3', 'CTRL-AUTHORITY-ROUTER-V3', 'prompt.registry.v1']
rights: 'APPROVED'
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: []
related_ids: ['CTRL-KNOWLEDGE-MAP-V3', 'CTRL-KB-STANDARD-V3']
manifest_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml'
json_registry_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/prompt-system/prompt-registry.json#/templates/5'
json_pointer: '/templates/5'
---

<kb_document>
<abstract>

# Abstract

Create retrieval-practice cards that test one meaningful concept at a time.
</abstract>
<navigation>

# Index

1. Flashcards route
2. cardCount, learningObjectives
3. prompt side to misconception cue
4. Format boundary and verification
</navigation>

<routing>
# Flashcards route

`R70-STUDIO` selects 4-12 source IDs for flashcards. `NLM_STUDIO_GENERATION_APPROVED` governs generation. Invalid breadth returns `BLOCKED_ALL_SOURCES`. Spanish output uses `es-419` without voseo.
</routing>
<knowledge>

# Flashcards contract

Registry location: `/templates/5`.

## Distinct inputs

- `cardCount`
- `learningObjectives`

## Artifact sequence

1. prompt side.
2. answer side.
3. why it matters.
4. misconception cue.

## Example

Example brief: produce eighteen cards that alternate concept recall, example selection, and misconception repair.
</knowledge>
<evidence>

# Flashcards evidence

[METODOLOGIA][source_ref:CTRL-AUTHORITY-ROUTER-V3] Evidence test: Answers are brief, accurate, and source-grounded.
</evidence>
<decisions>

# Flashcards trade-off

Prefer effortful retrieval and useful discrimination over a large count of easy definitions.
</decisions>
<assumptions>

# Flashcards assumption

[SUPUESTO] `learningObjectives` and the evidence needed for prompt side are confirmed before compilation.
</assumptions>
<limits>

# Flashcards boundary

Flashcards cannot substitute for practice that requires synthesis, judgment, or production. Negative rules resolve at `/templates/5/negativePrompt`; authority remains in `CTRL-AUTHORITY-ROUTER-V3`.
</limits>
<edge_cases>

# Flashcards edge case

If one prompt admits several defensible answers, constrain the context or convert it into a discussion task. Shared stop codes resolve through `CTRL-SYSTEM-PROMPT-V3`.
</edge_cases>
<acceptance>

# Flashcards acceptance

- Each card tests one concept rather than recognition alone.
- Answers are brief, accurate, and source-grounded.
- Distracting trivia and duplicate cards are absent.
- Coverage matches the declared learning objectives.
</acceptance>

<related_documents>

# Dependencies

`CTRL-KNOWLEDGE-MAP-V3`; `CTRL-SYSTEM-PROMPT-V3`; `prompt.registry.v1/templates/5`.
</related_documents>
<change_log>

# Change log

- `2026-08-26` — Flashcards v1.0 added to Canon v3.
  </change_log>
  </kb_document>
