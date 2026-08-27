---
schema: 'knowledge-document-metadata-v1'
document_id: 'PROMPT-STUDIO-VIDEO-V1'
title: 'Video Overview Prompt Template'
version: '1.0'
status: 'ACTIVE'
authority: 'TEMPLATE'
layer: '30 Templates'
language: 'en'
response_locales: ['en', 'es-419']
routes: ['R70-STUDIO']
tasks: ['create', 'brief', 'verify', 'video']
audiences: ['content strategist', 'editor', 'producer', 'verifier']
tags: ['notebooklm-os', 'canon-v3', 'prompt-template', 'studio', 'video']
keywords: ['video', 'Video Overview', 'source selection', 'idempotency', 'acceptance']
aliases: ['Video Overview', 'Video']
source_refs: ['CTRL-SYSTEM-PROMPT-V3', 'CTRL-AUTHORITY-ROUTER-V3', 'prompt.registry.v1']
rights: 'APPROVED'
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: []
related_ids: ['CTRL-KNOWLEDGE-MAP-V3', 'CTRL-KB-STANDARD-V3']
manifest_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml'
json_registry_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/prompt-system/prompt-registry.json#/templates/1'
json_pointer: '/templates/1'
---

<kb_document>
<abstract>

# Abstract

Create a concise visual explanation in which narration and scenes advance one argument.
</abstract>
<navigation>

# Index

1. Video Overview route
2. durationSeconds, aspectRatio
3. hook to single next step
4. Format boundary and verification
</navigation>

<routing>
# Video Overview route

`R70-STUDIO` selects 4-12 source IDs for video. `NLM_STUDIO_GENERATION_APPROVED` governs generation. Invalid breadth returns `BLOCKED_ALL_SOURCES`. Spanish output uses `es-419` without voseo.
</routing>
<knowledge>

# Video Overview contract

Registry location: `/templates/1`.

## Distinct inputs

- `durationSeconds`
- `aspectRatio`

## Artifact sequence

1. hook.
2. context.
3. three evidence beats.
4. boundary.
5. single next step.

## Example

Example brief: show how a governed source becomes a verified artifact in six scenes and sixty seconds.
</knowledge>
<evidence>

# Video Overview evidence

[METODOLOGIA][source_ref:CTRL-AUTHORITY-ROUTER-V3] Evidence test: Every scene serves the thesis and has readable text.
</evidence>
<decisions>

# Video Overview trade-off

Use fewer scenes with causal continuity instead of many disconnected visual ideas.
</decisions>
<assumptions>

# Video Overview assumption

[SUPUESTO] `aspectRatio` and the evidence needed for hook are confirmed before compilation.
</assumptions>
<limits>

# Video Overview boundary

A video overview is not a cinematic advertisement and cannot imply evidence through spectacle. Negative rules resolve at `/templates/1/negativePrompt`; authority remains in `CTRL-AUTHORITY-ROUTER-V3`.
</limits>
<edge_cases>

# Video Overview edge case

When required copy is too dense for the duration, shorten the argument rather than accelerate unreadable screens. Shared stop codes resolve through `CTRL-SYSTEM-PROMPT-V3`.
</edge_cases>
<acceptance>

# Video Overview acceptance

- Downloaded artifact has the requested duration and language.
- Every scene serves the thesis and has readable text.
- Visual direction follows the approved brand canon.
- Claims and assets pass independent readback.
</acceptance>

<related_documents>

# Dependencies

`CTRL-KNOWLEDGE-MAP-V3`; `CTRL-SYSTEM-PROMPT-V3`; `prompt.registry.v1/templates/1`.
</related_documents>
<change_log>

# Change log

- `2026-08-26` — Video Overview v1.0 added to Canon v3.
  </change_log>
  </kb_document>
