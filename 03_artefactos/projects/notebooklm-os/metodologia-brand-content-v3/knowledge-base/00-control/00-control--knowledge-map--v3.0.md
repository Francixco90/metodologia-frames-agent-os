---
schema: knowledge-document-metadata-v1
document_id: CTRL-KNOWLEDGE-MAP-V3
title: Canon v3 Knowledge Map
version: '3.0'
status: ACTIVE
authority: CONTROL
layer: 00 Control
language: en
response_locales: [en, es-419]
routes: ['R00-GOVERN']
tasks: [find-authority, assemble-source-set, resolve-document]
audiences: [notebook-runtime, conductor, curator, verifier]
tags: [knowledge-map, navigation, source-selection, authority]
keywords: [layers, routes, documents, source budget, retrieval]
aliases: [Canon v3 index, source navigation map]
source_refs: [CTRL-AUTHORITY-ROUTER-V3, CTRL-SYSTEM-PROMPT-V3]
rights: APPROVED
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: []
related_ids: [CTRL-BOOTSTRAP-V3, CTRL-KB-STANDARD-V3]
manifest_ref: 03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml
---

<kb_document>
<abstract>

# Abstract

The Canon v3 knowledge map is the first retrieval target after the notebook bootstrap. It maps user intent to a governing layer, active document IDs, source budget, and handoff without loading the whole corpus. [METODOLOGIA][source_ref:CTRL-AUTHORITY-ROUTER-V3]

</abstract>
<navigation>

# Index

1. Layer map
2. Route-to-source recipes
3. Discovery procedure
4. Acceptance and maintenance

</navigation>
<routing>

# Route-to-source recipes

| Intent                 | Primary authority           | Minimum source recipe                    | Handoff                     |
| ---------------------- | --------------------------- | ---------------------------------------- | --------------------------- |
| Governance or conflict | `CTRL-AUTHORITY-ROUTER-V3`  | control plus affected manifest entry     | Guardian when unresolved    |
| Method or strategy     | `CANON-OPERATING-METHOD-V3` | method plus relevant evidence            | R20 or R40                  |
| Brand voice or copy    | `CANON-BRAND-VOICE-V3`      | voice plus hooks when needed             | registered channel template |
| Visual direction       | `CANON-NEO-SWISS-V3`        | visual canon plus approved asset records | Asset Steward               |
| Curriculum             | `CANON-CURRICULUM-V3`       | curriculum plus one lesson guide         | pedagogy route              |
| Teaching               | active `PEDAGOGY-*` guide   | one guide, relevant canon, evidence      | learning verifier           |
| Content creation       | `prompt.registry.v1`        | one template plus canon and evidence     | editorial review            |
| Studio                 | selected Studio template    | 4 to 12 explicit sources                 | Studio generation gate      |
| Claim or freshness     | `EVIDENCE-CLAIMS-GAPS-V3`   | claim record plus primary evidence       | verifier or gap             |
| Asset use              | `ASSET-USAGE-V3`            | asset record plus visual canon           | asset veto applies          |
| Versions or receipts   | active `OPS-*` control      | manifest plus affected receipt           | lifecycle gate              |
| Historical comparison  | active `REFERENCE-*` entry  | reference plus current authority         | never auto-promote          |

</routing>
<knowledge>

# Layer map

## 00 Control

- `CTRL-BOOTSTRAP-V3`: compact NotebookLM instructions.
- `CTRL-SYSTEM-PROMPT-V3`: full operating behavior.
- `CTRL-KNOWLEDGE-MAP-V3`: route and discovery index.
- `CTRL-AUTHORITY-ROUTER-V3`: precedence, gates, states, and failure codes.
- `CTRL-KB-STANDARD-V3`: Markdown, metadata, XML, evidence, and indexing standard.

## 10 Canon

- `CANON-OPERATING-METHOD-V3`: intention, method, execution, evidence, and improvement.
- `CANON-CURRICULUM-V3`: learning progression and session selection.
- `CANON-CONTENT-STUDIO-V3`: content architecture and format decisions.
- `CANON-AGENTIC-SOVEREIGNTY-V3`: bounded autonomy and provider portability.
- `CANON-BRAND-VOICE-V3`: voice, rhetoric, localization, and editing.
- `CANON-HOOKS-CTA-V3`: truthful openings, compression, and action.
- `CANON-NEO-SWISS-V3`: visual tokens, composition, and accessibility.

## 20 Evidence

Use active `EVIDENCE-*` documents for claims, provenance, freshness, contradictions, owner decisions, and gaps. Evidence can support or block a claim; it cannot rewrite Control or grant asset rights.

## 30 Templates

`prompt.registry.v1` contains exactly 22 executable entries. Human-readable projections use `PROMPT-STUDIO-*` for nine Studio artifact types and `PROMPT-CHANNEL-*` for thirteen publication channels. Select exactly one primary template per deliverable.

## 40 References

Use `REFERENCE-*` sources for editorial patterns, historical comparisons, and golden examples. They inspire composition but do not authorize claims, assets, or behavior.

## 50 Assets

Use `ASSET-*` sources to resolve asset ID, master hash, rights, consent, transformations, permitted context, and expiry. This layer has veto over all visible asset use.

## 60 Operations

Use `OPS-*` sources for naming, manifests, identity, deduplication, source selection, receipts, readback, recovery, and lifecycle procedures.

## 70 Pedagogy

Use one active `PEDAGOGY-*` guide per lesson and the transfer matrix where assessment is material. A pedagogy guide explains how to teach or understand; it does not automatically promote transcript language to canon.

## 80 Working and 90 Archive

Working sources are bounded and temporary. Archive sources are superseded or historical. Neither can defeat an active authority or be selected by default.

## Discovery procedure

1. Identify intent and requested effect.
2. Resolve the primary route and authority above.
3. Filter manifest entries to `status: ACTIVE`, valid date, allowed rights, and matching routes.
4. Add only the evidence, template, pedagogy, reference, asset, or operation needed to complete the task.
5. Enforce 3 to 8 sources for chat, 4 to 12 for Studio, or 1 to 20 for a justified audit batch.
6. Canonicalize and hash the ordered source set; record omissions and conflicts.
7. Return `BLOCKED_ALL_SOURCES` for empty, wildcard, or corpus-wide selection.

</knowledge>
<evidence>

# Evidence

- [METODOLOGIA][source_ref:CTRL-AUTHORITY-ROUTER-V3] Layer precedence protects rules and rights from being overwritten by examples or generated artifacts.
- [INFERENCIA][source_ref:CTRL-SYSTEM-PROMPT-V3] A route-first map reduces irrelevant retrieval and makes conflicts easier to diagnose.

</evidence>
<decisions>

# Decisions

- Organize discovery by stable document ID and route, not filename or title.
- Keep detailed file inventory in the manifest; this map describes logical authority.
- Permit one primary route with at most two support routes to prevent authority fusion.

</decisions>
<assumptions>

# Assumptions

- [SUPUESTO] The manifest resolves every logical ID to one active local or remote source.
- [SUPUESTO] Expected Evidence, Asset, Operations, Pedagogy, and Reference IDs are validated before notebook import.

</assumptions>
<limits>

# Limits

This map is not a source manifest and contains no hashes or private locators. It cannot prove that an expected document was imported, indexed, or retrieved.

</limits>
<edge_cases>

# Edge cases

- Missing expected ID: declare `coverage_gap` and do not substitute archive content.
- Two active documents for one logical unit: return `BLOCKED_AUTHORITY_CONFLICT`.
- Mixed create and asset request: R40 compiles content; R60 independently authorizes or blocks the asset.
- Large audit: split into batches of at most 20 while preserving a parent audit receipt.

</edge_cases>
<acceptance>

# Acceptance criteria

- Every active document is reachable through a layer, route, task, tag, alias, or related ID.
- Canonical retrieval tests find the correct primary authority without selecting all sources.
- No reference, PDF, working source, or archive source is described as governing authority.
- Document IDs resolve uniquely through the manifest.

</acceptance>
<related_documents>

# Related documents

All active Canon v3 control documents, `prompt.registry.v1`, and the source manifest.

</related_documents>
<change_log>

# Change log

- 2026-08-26: v3.0 introduced route-first discovery and bounded source recipes.

</change_log>
</kb_document>
