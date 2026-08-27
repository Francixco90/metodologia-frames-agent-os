---
name: notebooklm-studio-director
description: Use when converting a natural-language content request into a type-specific NotebookLM Studio brief for audio, video, infographic, slides, report, flashcards, quiz, data table, or mind map.
metadata: {owner: MetodologIA, lifecycle_state: candidate, execution_scope: local-briefing}
---

# NotebookLM Studio Director

## Trigger

Use to compile or execute one NotebookLM Studio artifact request.

## Inputs

Type-specific intent, audience, objective, explicit sources, constraints and acceptance; for brand
work, a bounded brief from `notebooklm-brand-content-director`.

## Outputs

Create one `StudioBriefV1` per artifact with structure, style, duration and source IDs. Each format
gets its own instruction; revisions create successors. Never ask Studio to recreate a protected logo.

## Stop rules

Block unsupported claims, unapproved assets, out-of-scope/all-sources sets, and generation without
`NLM_STUDIO_GENERATION_APPROVED`.

## Done contract

A type-specific brief or receipted generation exists. Generation is not verification, approval,
sharing or publication.
