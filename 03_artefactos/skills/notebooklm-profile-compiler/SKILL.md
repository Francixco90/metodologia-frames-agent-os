---
name: notebooklm-profile-compiler
description: Use when creating or evolving a governed notebook profile, its identity, source budget, roles, policies, gates, taxonomy, or compiled system prompt.
metadata: {owner: MetodologIA, lifecycle_state: candidate, execution_scope: local-compilation}
---

# NotebookLM Profile Compiler

## Trigger

Use to create or evolve a governed notebook profile.

## Inputs

`NotebookProfileV1`; for brand work, a validated `BrandKnowledgePackV1`.

## Outputs

Validate taxonomy, roles, budgets and gates. Compile `NotebookSystemPromptV1` with identity, limits,
source/conflict rules, injection defense, rights, no invention, Studio contract and handoffs. Brand
rules retain evidence state; unconfirmed traits remain `REVIEW` and locale follows the request.

## Stop rules

Block unknown owner, authority or rights and any private locator. Never overwrite the active version.

## Done contract

A versioned successor and prompt digest are deterministic. `NLM_BRAND_PROFILE_APPROVED` may activate
the profile but grants no provider or publication effect.
