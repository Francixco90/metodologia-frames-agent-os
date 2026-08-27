---
schema: 'knowledge-document-metadata-v1'
document_id: 'PROMPT-CHANNEL-LANDING-PAGE-V1'
title: 'Landing Page Prompt Template'
version: '1.0'
status: 'ACTIVE'
authority: 'TEMPLATE'
layer: '30 Templates'
language: 'en'
response_locales: ['en', 'es-419']
routes: ['R40-CREATE']
tasks: ['create', 'brief', 'verify', 'landing-page']
audiences: ['content strategist', 'editor', 'producer', 'verifier']
tags: ['notebooklm-os', 'canon-v3', 'prompt-template', 'channel', 'landing-page']
keywords: ['landing-page', 'Landing Page', 'source selection', 'idempotency', 'acceptance']
aliases: ['Landing Page']
source_refs: ['CTRL-SYSTEM-PROMPT-V3', 'CTRL-AUTHORITY-ROUTER-V3', 'prompt.registry.v1']
rights: 'APPROVED'
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: []
related_ids: ['CTRL-KNOWLEDGE-MAP-V3', 'CTRL-KB-STANDARD-V3']
manifest_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml'
json_registry_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/prompt-system/prompt-registry.json#/templates/19'
json_pointer: '/templates/19'
---

<kb_document>
<abstract>

# Abstract

Help a defined audience evaluate an offer without inflated promises or hidden ambiguity.
</abstract>
<navigation>

# Index

1. Landing Page route
2. offer, conversionAction, pageContext
3. hero thesis to CTA
4. Format boundary and verification
</navigation>

<routing>
# Landing Page route

`R40-CREATE` selects 3-8 source IDs for landing-page. Draft compilation requires no external mutation gate; `HUMAN_APPROVED` and publication remain separate promotions. Invalid breadth returns `BLOCKED_ALL_SOURCES`. Spanish output uses `es-419` without voseo.
</routing>
<knowledge>

# Landing Page contract

Registry location: `/templates/19`.

## Distinct inputs

- `offer`
- `conversionAction`
- `pageContext`

## Artifact sequence

1. hero thesis.
2. audience problem.
3. value mechanism.
4. how it works.
5. evidence.
6. fit and non-fit.
7. FAQ.
8. CTA.

## Example

Example brief: present a workshop with audience, value mechanism, agenda, evidence, non-fit, FAQ, and one CTA.
</knowledge>
<evidence>

# Landing Page evidence

[METODOLOGIA][source_ref:CTRL-AUTHORITY-ROUTER-V3] Evidence test: Claims and proof remain paired.
</evidence>
<decisions>

# Landing Page trade-off

Clarify fit and mechanism before optimizing persuasion or conversion language.
</decisions>
<assumptions>

# Landing Page assumption

[SUPUESTO] `pageContext` and the evidence needed for hero thesis are confirmed before compilation.
</assumptions>
<limits>

# Landing Page boundary

A landing page cannot use fake scarcity, invented testimonials, dark patterns, or unsupported outcome guarantees. Negative rules resolve at `/templates/19/negativePrompt`; authority remains in `CTRL-AUTHORITY-ROUTER-V3`.
</limits>
<edge_cases>

# Landing Page edge case

If an audience is explicitly not a fit, say so near qualification criteria instead of burying the boundary. Shared stop codes resolve through `CTRL-SYSTEM-PROMPT-V3`.
</edge_cases>
<acceptance>

# Landing Page acceptance

- Visitor can identify fit, mechanism, and next step.
- Claims and proof remain paired.
- Accessibility and mobile scan order are specified.
- No dark pattern, fake urgency, or invented social proof appears.
</acceptance>

<related_documents>

# Dependencies

`CTRL-KNOWLEDGE-MAP-V3`; `CTRL-SYSTEM-PROMPT-V3`; `prompt.registry.v1/templates/19`.
</related_documents>
<change_log>

# Change log

- `2026-08-26` — Landing Page v1.0 added to Canon v3.
  </change_log>
  </kb_document>
