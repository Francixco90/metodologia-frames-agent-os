---
schema: 'knowledge-document-metadata-v1'
document_id: 'PROMPT-STUDIO-AUDIO-V1'
title: 'Audio Overview Prompt Template'
version: '1.0'
status: 'ACTIVE'
authority: 'TEMPLATE'
layer: '30 Templates'
language: 'en'
response_locales: ['en', 'es-419']
routes: ['R70-STUDIO']
tasks: ['create', 'brief', 'verify', 'audio']
audiences: ['content strategist', 'editor', 'producer', 'verifier']
tags: ['notebooklm-os', 'canon-v3', 'prompt-template', 'studio', 'audio']
keywords: ['audio', 'Audio Overview', 'source selection', 'idempotency', 'acceptance']
aliases: ['Audio Overview', 'Audio']
source_refs: ['CTRL-SYSTEM-PROMPT-V3', 'CTRL-AUTHORITY-ROUTER-V3', 'prompt.registry.v1']
rights: 'APPROVED'
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: []
related_ids: ['CTRL-KNOWLEDGE-MAP-V3', 'CTRL-KB-STANDARD-V3']
manifest_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml'
json_registry_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/prompt-system/prompt-registry.json#/templates/0'
json_pointer: '/templates/0'
---

<kb_document>
<abstract>

# Abstract

Turn a bounded source set into a paced, source-grounded spoken explanation.
</abstract>
<navigation>

# Index

1. Audio Overview route
2. durationMinutes, speakerMode
3. opening question to closing synthesis
4. Format boundary and verification
</navigation>

<routing>
# Audio Overview route

`R70-STUDIO` selects 4-12 source IDs for audio. `NLM_STUDIO_GENERATION_APPROVED` governs generation. Invalid breadth returns `BLOCKED_ALL_SOURCES`. Spanish output uses `es-419` without voseo.
</routing>
<knowledge>

# Audio Overview contract

Registry location: `/templates/0`.

## Distinct inputs

- `durationMinutes`
- `speakerMode`

## Artifact sequence

1. opening question.
2. thesis.
3. evidence-led conversation.
4. limits.
5. closing synthesis.

## Example

Example brief: explain one operating decision in eight minutes with two speakers, three cited claims, and a spoken limitation.
</knowledge>
<evidence>

# Audio Overview evidence

[METODOLOGIA][source_ref:CTRL-AUTHORITY-ROUTER-V3] Evidence test: Every strong claim maps to supplied evidence.
</evidence>
<decisions>

# Audio Overview trade-off

Favor conversational clarity over exhaustive coverage; listeners cannot scan backward like report readers.
</decisions>
<assumptions>

# Audio Overview assumption

[SUPUESTO] `speakerMode` and the evidence needed for opening question are confirmed before compilation.
</assumptions>
<limits>

# Audio Overview boundary

Audio cannot carry a visual-only comparison or an unverifiable speaker persona. Negative rules resolve at `/templates/0/negativePrompt`; authority remains in `CTRL-AUTHORITY-ROUTER-V3`.
</limits>
<edge_cases>

# Audio Overview edge case

If a name or acronym lacks pronunciation guidance, flag it before recording. Shared stop codes resolve through `CTRL-SYSTEM-PROMPT-V3`.
</edge_cases>
<acceptance>

# Audio Overview acceptance

- Requested language and duration are confirmed from downloaded audio.
- Every strong claim maps to supplied evidence.
- Speakers distinguish source fact from interpretation.
- No internal prompt or source identifier is spoken.
</acceptance>

<related_documents>

# Dependencies

`CTRL-KNOWLEDGE-MAP-V3`; `CTRL-SYSTEM-PROMPT-V3`; `prompt.registry.v1/templates/0`.
</related_documents>
<change_log>

# Change log

- `2026-08-26` — Audio Overview v1.0 added to Canon v3.
  </change_log>
  </kb_document>
