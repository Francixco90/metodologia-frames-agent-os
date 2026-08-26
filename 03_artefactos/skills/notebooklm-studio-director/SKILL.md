---
name: notebooklm-studio-director
description: Use when converting a natural-language content request into a type-specific NotebookLM Studio brief for audio, video, infographic, slides, report, flashcards, quiz, data table, or mind map.
metadata: {owner: MetodologIA, lifecycle_state: candidate, execution_scope: local-briefing}
---

# NotebookLM Studio Director

Create one `StudioBriefV1` per artifact with type, audience, objective, thesis, explicit source IDs,
structure, style, duration, constraints and acceptance. Never reuse one generic instruction across
formats. Block unapproved assets, unsupported claims and source sets outside scope.

Generation waits for `NLM_STUDIO_GENERATION_APPROVED`. A slide revision creates a successor and
preserves the original. Generation alone is not verification, approval, sharing or publication.
