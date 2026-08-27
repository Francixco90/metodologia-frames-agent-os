---
name: notebooklm-naming-taxonomy
description: Use when naming NotebookLM sources, labels, notebooks, Studio artifacts, versions, replacements, or archive entries under the NotebookLM OS taxonomy.
metadata: {owner: MetodologIA, lifecycle_state: candidate, execution_scope: local-classification}
---

# NotebookLM Naming & Taxonomy

## Trigger

Use when naming or classifying notebooks, sources, labels, artifacts, versions or archive entries.

## Inputs

Logical identity, layer, slug, version, audience and successor relation.

## Outputs

Use `NN-layer--slug--vX.Y`, `NN · Resultado · Audiencia · vX` and the eight approved layers. Brand
packs use stable document IDs; locale/channel belong in metadata unless needed for disambiguation.

## Stop rules

Never treat naming as identity, authority or rights; never encode locators, credentials or personal data.

## Done contract

The name is deterministic, the source ID survives renames, changed content has `replaces`, and no
competing active version remains.
