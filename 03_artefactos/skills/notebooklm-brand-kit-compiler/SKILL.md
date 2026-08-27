---
name: notebooklm-brand-kit-compiler
description: Compile validated brand evidence into a governed, source-selectable knowledge pack, Markdown controls, manifests, knowledge map, and profile proposal for a brand-content notebook.
metadata: {owner: MetodologIA, lifecycle_state: candidate, execution_scope: local-compilation}
---

# NotebookLM Brand Kit Compiler

## Trigger

Use at N02–N03 after a brand intake packet is available.

## Inputs

Traceable intake/evidence, owner and intended profile. Read
[references/knowledge-pack.md](references/knowledge-pack.md) for layers and source-set design.

## Outputs

Compile `BrandKnowledgePackV1`, knowledge map, full prompt, compact bootstrap, manifests, grounding
suite and small active source sets. Separate identity, positioning, voice, rhetoric, vocabulary,
claims, visuals, assets, channels and exclusions. Originals retain authority; Markdown is a projection.

## Stop rules

`INFERRED` remains `REVIEW`; `BLOCKED` cannot enter active sets. Missing fields remain gaps. Never
create plausible branding, competing canon or silent overwrites.

## Done contract

An unapproved pack ends at `BRAND_PROFILE_REVIEW`. Only `activateBrandKnowledgePack` with a receipt
bound to the reviewed pack digest can activate it. `BRAND_NOTEBOOK_PLAN_READY` requires receipt
digests for every verified stage; external materialization still waits for `NLM_PLAN_APPROVED`.
