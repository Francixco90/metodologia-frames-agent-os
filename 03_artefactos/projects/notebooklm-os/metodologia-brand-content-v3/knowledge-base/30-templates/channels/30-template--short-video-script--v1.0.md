---
schema: 'knowledge-document-metadata-v1'
document_id: 'PROMPT-CHANNEL-SHORT-VIDEO-SCRIPT-V1'
title: 'Short Video Script Prompt Template'
version: '1.0'
status: 'ACTIVE'
authority: 'TEMPLATE'
layer: '30 Templates'
language: 'en'
response_locales: ['en', 'es-419']
routes: ['R40-CREATE']
tasks: ['create', 'brief', 'verify', 'short-video-script']
audiences: ['content strategist', 'editor', 'producer', 'verifier']
tags: ['notebooklm-os', 'canon-v3', 'prompt-template', 'channel', 'short-video-script']
keywords:
  ['short-video-script', 'Short Video Script', 'source selection', 'idempotency', 'acceptance']
aliases: ['Short Video Script']
source_refs: ['CTRL-SYSTEM-PROMPT-V3', 'CTRL-AUTHORITY-ROUTER-V3', 'prompt.registry.v1']
rights: 'APPROVED'
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: []
related_ids: ['CTRL-KNOWLEDGE-MAP-V3', 'CTRL-KB-STANDARD-V3']
manifest_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml'
json_registry_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/prompt-system/prompt-registry.json#/templates/16'
json_pointer: '/templates/16'
---

<kb_document>
<abstract>

# Abstract

Deliver one useful shift in a short, production-ready audiovisual script.
</abstract>
<navigation>

# Index

1. Short Video Script route
2. durationSeconds, platform, aspectRatio
3. first-second hook to CTA
4. Format boundary and verification
</navigation>

<routing>
# Short Video Script route

`R40-CREATE` selects 3-8 source IDs for short-video-script. Draft compilation requires no external mutation gate; `HUMAN_APPROVED` and publication remain separate promotions. Invalid breadth returns `BLOCKED_ALL_SOURCES`. Spanish output uses `es-419` without voseo.
</routing>
<knowledge>

# Short Video Script contract

Registry location: `/templates/16`.

## Distinct inputs

- `durationSeconds`
- `platform`
- `aspectRatio`

## Artifact sequence

1. first-second hook.
2. problem.
3. reframe.
4. proof.
5. punchline.
6. CTA.

## Example

Example brief: write a forty-five-second vertical script with separate voiceover, screen copy, and visual action.
</knowledge>
<evidence>

# Short Video Script evidence

[METODOLOGIA][source_ref:CTRL-AUTHORITY-ROUTER-V3] Evidence test: Voiceover, on-screen text, and visual action are separable.
</evidence>
<decisions>

# Short Video Script trade-off

Choose one memorable shift instead of compressing a complete tutorial into seconds.
</decisions>
<assumptions>

# Short Video Script assumption

[SUPUESTO] `aspectRatio` and the evidence needed for first-second hook are confirmed before compilation.
</assumptions>
<limits>

# Short Video Script boundary

A short script cannot use urgency, fear, or impossible speed to conceal a weak proposition. Negative rules resolve at `/templates/16/negativePrompt`; authority remains in `CTRL-AUTHORITY-ROUTER-V3`.
</limits>
<edge_cases>

# Short Video Script edge case

If the punchline introduces a new claim, move that claim earlier and support it before the close. Shared stop codes resolve through `CTRL-SYSTEM-PROMPT-V3`.
</edge_cases>
<acceptance>

# Short Video Script acceptance

- Timing fits the requested duration.
- Voiceover, on-screen text, and visual action are separable.
- Hook is accurate rather than sensational.
- The closing line resolves the opening tension.
</acceptance>

<related_documents>

# Dependencies

`CTRL-KNOWLEDGE-MAP-V3`; `CTRL-SYSTEM-PROMPT-V3`; `prompt.registry.v1/templates/16`.
</related_documents>
<change_log>

# Change log

- `2026-08-26` — Short Video Script v1.0 added to Canon v3.
  </change_log>
  </kb_document>
