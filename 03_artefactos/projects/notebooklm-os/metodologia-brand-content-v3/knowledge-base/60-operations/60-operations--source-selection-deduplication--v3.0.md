---
schema: knowledge-document-metadata-v1
document_id: OPS-SOURCE-SELECTION-V3
title: Naming, Source Selection, and Deduplication
version: '3.0'
status: ACTIVE
authority: OPERATIONAL
layer: 60 Operations
language: en
response_locales: [en, es-419]
routes: ['R00-GOVERN', 'R80-AUDIT']
tasks: [name-source, build-working-set, deduplicate-source]
audiences: [curator, notebook-operator, verifier]
tags: [sources, naming, deduplication, working-set]
keywords: [hash, source ID, authority, source budget]
aliases: [source curation rules, naming rules]
source_refs: [LEGACY-KB-60-OPERATIONS-V1, LEGACY-KB-62-NAMING-V2, FORMATION-CANON-V1]
rights: APPROVED
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: [LEGACY-KB-62-NAMING-V2]
related_ids: [CTRL-KNOWLEDGE-MAP-V3, EVIDENCE-CORPUS-COMPLETENESS-V3, OPS-RECEIPTS-READBACK-V3]
manifest_ref: 03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml
---

<kb_document>
<abstract>

# Abstract

Source curation uses stable identity, explicit authority, purpose-built working sets, and idempotent operations. Titles and labels aid discovery; they never establish equality or authority. [METODOLOGIA][source_ref:LEGACY-KB-62-NAMING-V2]

</abstract>
<navigation>

# Index

1. Naming and roles
2. Identity and succession
3. Working-set compiler
4. Acceptance

</navigation>
<routing>

# Routing

Use this document to curate or select sources. Control owns authority and gates; `OPS-RECEIPTS-READBACK-V3` owns mutation evidence.

</routing>
<knowledge>

# Naming and roles

Local file: `NN-layer--scope-topic--vX.Y.ext`. Notebook title: `NN · Role · Scope · Title · vX.Y`. Allowed layers are Control, Canon, Evidence, Templates, Golden References, Assets, Operations, Pedagogy, Working Sets, and Archive. Roles describe function—`CONTROL`, `CANON`, `EVIDENCE`, `TEMPLATE`, `GOLDEN_REFERENCE`, `ASSET_CONTROL`, `PEDAGOGY`, `OPERATIONS`, `ARCHIVE`—but only authority metadata and precedence determine governance. [METODOLOGIA]

# Identity and succession

Prefer provider-native immutable ID, canonical Drive ID/URL, and content SHA-256. Same hash means one logical source with multiple provenance events; same title with different hash means a variant; title/size similarity without hash is ambiguous. A version becomes successor only through an explicit relationship and authority decision. Never delete or overwrite historical sources to simulate consolidation.

# Working-set compiler

1. Parse intent, output, audience, topic, sensitivity, and date.
2. Select Control/Canon documents required by route.
3. Add claim evidence, templates, assets, and at most two references only when needed.
4. Remove superseded, duplicate, conflicting, out-of-scope, expired, unauthorized, and private data.
5. Record ordered `source_ids` and compute `source_set_hash`.
6. Enforce budgets: chat normally 3–8 sources; Studio 4–12; broad audits up to 20 per batch.

Empty or implicit all-source selection returns `BLOCKED_ALL_SOURCES`. Exceeding a budget requires a documented exception and batching plan. PDFs inspire; active Markdown governs; Assets retains veto. [METODOLOGIA]

</knowledge>
<evidence>

# Evidence

The budgets are operating defaults chosen to improve retrieval and traceability; they are not provider performance guarantees. [METODOLOGIA][source_ref:LEGACY-KB-60-OPERATIONS-V1]

</evidence>
<decisions>

# Decisions

Preserve original source titles in provenance even when a normalized display alias is added. Use explicit source IDs for every query and Studio brief. Exclude the benchmark pack from Canon v3 unless a task explicitly mounts it as a separate working set.

</decisions>
<assumptions>

# Assumptions

[SUPUESTO] Content hashes are computed from stable bytes. [SUPUESTO] The adapter can select source subsets or refuse when it cannot.

</assumptions>
<limits>

# Limits

Semantic similarity is not safe deduplication. A small source set can still be wrong if its authority is weak or its coverage incomplete.

</limits>
<edge_cases>

# Edge cases

- Timeout after import: read back before retry.
- Source updates in Drive: create or sync a successor and preserve prior digest.
- Conflicting canon: block until precedence or owner decision resolves it.
- Necessary evidence exceeds 20 sources: split by claim family and synthesize with citations.

</edge_cases>
<acceptance>

# Acceptance

The working set has explicit IDs, role and authority, no logical duplicates, documented exclusions, a reproducible hash, justified size, and enough evidence for the stated task. A second execution adds zero duplicates.

</acceptance>
<related_documents>

# Related documents

`CTRL-KNOWLEDGE-MAP-V3`, `EVIDENCE-CORPUS-COMPLETENESS-V3`, `OPS-RECEIPTS-READBACK-V3`.

</related_documents>
<change_log>

# Change log

- v3.0: merged naming and selection, added a working-set compiler, budgets, benchmark isolation, and explicit all-source blocking.

</change_log>
</kb_document>
