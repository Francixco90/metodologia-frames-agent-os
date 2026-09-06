---
schema: 'knowledge-document-metadata-v1'
document_id: 'PROMPT-CHANNEL-NEWSLETTER-ARTICLE-V1'
title: 'Newsletter or Article Prompt Template'
version: '1.0'
status: 'ACTIVE'
authority: 'TEMPLATE'
layer: '30 Templates'
language: 'en'
response_locales: ['en', 'es-419']
routes: ['R40-CREATE']
tasks: ['create', 'brief', 'verify', 'newsletter-article']
audiences: ['content strategist', 'editor', 'producer', 'verifier']
tags: ['notebooklm-os', 'canon-v3', 'prompt-template', 'channel', 'newsletter-article']
keywords:
  ['newsletter-article', 'Newsletter or Article', 'source selection', 'idempotency', 'acceptance']
aliases: ['Newsletter or Article', 'Newsletter Article']
source_refs: ['CTRL-SYSTEM-PROMPT-V3', 'CTRL-AUTHORITY-ROUTER-V3', 'prompt.registry.v1']
rights: 'APPROVED'
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: []
related_ids: ['CTRL-KNOWLEDGE-MAP-V3', 'CTRL-KB-STANDARD-V3']
manifest_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml'
json_registry_ref: '03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/prompt-system/prompt-registry.json#/templates/17'
json_pointer: '/templates/17'
---

<kb_document>
<abstract>

# Abstract

Explain a consequential idea with enough depth for reflection and action.
</abstract>
<navigation>

# Index

1. Newsletter or Article route
2. lengthRange, publicationContext
3. title to close
4. Format boundary and verification
</navigation>

<routing>
# Newsletter or Article route

`R40-CREATE` selects 3-8 source IDs for newsletter-article. Draft compilation requires no external mutation gate; `HUMAN_APPROVED` and publication remain separate promotions. Invalid breadth returns `BLOCKED_ALL_SOURCES`. Spanish output uses `es-419` without voseo.
</routing>
<knowledge>

# Newsletter or Article contract

Registry location: `/templates/17`.

## Distinct inputs

- `lengthRange`
- `publicationContext`

## Artifact sequence

1. title.
2. abstract.
3. opening tension.
4. argument.
5. evidence.
6. counterpoint.
7. application.
8. close.

## Example

Example brief: develop a 1,200-word argument with an abstract, three claims, one counterpoint, and a field exercise.
</knowledge>
<evidence>

# Newsletter or Article evidence

[METODOLOGIA][source_ref:CTRL-AUTHORITY-ROUTER-V3] Evidence test: Sections add distinct value without repetition.
</evidence>
<decisions>

# Newsletter or Article trade-off

Use enough depth to change a reader's model while removing branches that do not affect action.
</decisions>
<assumptions>

# Newsletter or Article assumption

[SUPUESTO] `publicationContext` and the evidence needed for title are confirmed before compilation.
</assumptions>
<limits>

# Newsletter or Article boundary

An article cannot turn a personal analogy into scientific or universal evidence. Negative rules resolve at `/templates/17/negativePrompt`; authority remains in `CTRL-AUTHORITY-ROUTER-V3`.
</limits>
<edge_cases>

# Newsletter or Article edge case

When a counterexample changes the thesis, revise the thesis rather than confining the exception to a footnote. Shared stop codes resolve through `CTRL-SYSTEM-PROMPT-V3`.
</edge_cases>
<acceptance>

# Newsletter or Article acceptance

- Title and abstract accurately represent the argument.
- Sections add distinct value without repetition.
- Sources, assumptions, and limits are distinguishable.
- Reader leaves with a practical decision or experiment.
</acceptance>

<related_documents>

# Dependencies

`CTRL-KNOWLEDGE-MAP-V3`; `CTRL-SYSTEM-PROMPT-V3`; `prompt.registry.v1/templates/17`.
</related_documents>
<change_log>

# Change log

- `2026-08-26` — Newsletter or Article v1.0 added to Canon v3.
  </change_log>
  </kb_document>
