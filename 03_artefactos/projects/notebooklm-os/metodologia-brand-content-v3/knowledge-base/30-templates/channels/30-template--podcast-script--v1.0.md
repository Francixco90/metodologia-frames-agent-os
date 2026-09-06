---
schema: 'knowledge-document-metadata-v1'
document_id: 'PROMPT-CHANNEL-PODCAST-SCRIPT-V1'
title: 'Podcast Script Prompt Template'
version: '1.0'
status: 'ACTIVE'
authority: 'TEMPLATE'
layer: '30 Templates'
language: 'en'
response_locales: ['en', 'es-419']
routes: ['R40-CREATE']
tasks: ['create', 'brief', 'verify', 'podcast-script']
audiences: ['content strategist', 'editor', 'producer', 'verifier']
tags: ['notebooklm-os', 'canon-v3', 'prompt-template', 'channel', 'podcast-script']
keywords: ['podcast-script', 'Podcast Script', 'source selection', 'idempotency', 'acceptance']
aliases: ['Podcast Script']
source_refs: ['CTRL-SYSTEM-PROMPT-V3', 'CTRL-AUTHORITY-ROUTER-V3', 'prompt.registry.v1']
rights: 'APPROVED'
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: []
related_ids: ['CTRL-KNOWLEDGE-MAP-V3', 'CTRL-KB-STANDARD-V3']
manifest_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml'
json_registry_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/prompt-system/prompt-registry.json#/templates/15'
json_pointer: '/templates/15'
---

<kb_document>
<abstract>

# Abstract

Develop a listenable, evidence-led conversation or monologue with editorial pacing.
</abstract>
<navigation>

# Index

1. Podcast Script route
2. durationMinutes, speakerMode
3. cold open to CTA
4. Format boundary and verification
</navigation>

<routing>
# Podcast Script route

`R40-CREATE` selects 3-8 source IDs for podcast-script. Draft compilation requires no external mutation gate; `HUMAN_APPROVED` and publication remain separate promotions. Invalid breadth returns `BLOCKED_ALL_SOURCES`. Spanish output uses `es-419` without voseo.
</routing>
<knowledge>

# Podcast Script contract

Registry location: `/templates/15`.

## Distinct inputs

- `durationMinutes`
- `speakerMode`

## Artifact sequence

1. cold open.
2. promise.
3. segments.
4. examples.
5. counterpoint.
6. synthesis.
7. CTA.

## Example

Example brief: script a twelve-minute solo episode that challenges one misconception and proposes one experiment.
</knowledge>
<evidence>

# Podcast Script evidence

[METODOLOGIA][source_ref:CTRL-AUTHORITY-ROUTER-V3] Evidence test: Spoken language sounds natural in the target locale.
</evidence>
<decisions>

# Podcast Script trade-off

Preserve authentic spoken rhythm without relaxing attribution or evidence conditions.
</decisions>
<assumptions>

# Podcast Script assumption

[SUPUESTO] `speakerMode` and the evidence needed for cold open are confirmed before compilation.
</assumptions>
<limits>

# Podcast Script boundary

A script cannot imply a guest, endorsement, interview, or lived experience that was not approved and recorded. Negative rules resolve at `/templates/15/negativePrompt`; authority remains in `CTRL-AUTHORITY-ROUTER-V3`.
</limits>
<edge_cases>

# Podcast Script edge case

If a technical fact requires a visual, restate it as an audible comparison or move it to companion notes. Shared stop codes resolve through `CTRL-SYSTEM-PROMPT-V3`.
</edge_cases>
<acceptance>

# Podcast Script acceptance

- Runtime estimate fits the word count.
- Spoken language sounds natural in the target locale.
- Attributions and uncertainty are audible.
- No visual-only information is required to follow the argument.
</acceptance>

<related_documents>

# Dependencies

`CTRL-KNOWLEDGE-MAP-V3`; `CTRL-SYSTEM-PROMPT-V3`; `prompt.registry.v1/templates/15`.
</related_documents>
<change_log>

# Change log

- `2026-08-26` — Podcast Script v1.0 added to Canon v3.
  </change_log>
  </kb_document>
