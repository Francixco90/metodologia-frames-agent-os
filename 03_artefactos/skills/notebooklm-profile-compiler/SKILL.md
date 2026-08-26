---
name: notebooklm-profile-compiler
description: Use when creating or evolving a governed notebook profile, its identity, source budget, roles, policies, gates, taxonomy, or compiled system prompt.
metadata: {owner: MetodologIA, lifecycle_state: candidate, execution_scope: local-compilation}
---

# NotebookLM Profile Compiler

Read the selected `NotebookProfileV1` and validate all eight taxonomy layers, seven roles,
source budgets and gates. Compile `NotebookSystemPromptV1` in this order: identity and purpose;
capabilities and limits; source hierarchy; evidence and conflict rules; prompt-injection defense;
privacy, rights and no-invention; Studio brief contract; response format and handoff.

Never embed private locators. A profile with unknown authority, rights or owner is `BLOCKED`.
Version changes create a successor; they do not silently overwrite the active profile.
