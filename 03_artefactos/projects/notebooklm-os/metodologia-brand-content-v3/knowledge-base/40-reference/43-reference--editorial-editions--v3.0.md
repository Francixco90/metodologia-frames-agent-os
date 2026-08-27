---
schema: knowledge-document-metadata-v1
document_id: REFERENCE-EDITORIAL-EDITION-V3
title: Historical Editorial Edition Comparison
version: '3.0'
status: ACTIVE
authority: REFERENCE
layer: 40 Golden References
language: en
response_locales: [en, es-419]
routes: ['R10-BRAND', 'R40-CREATE', 'R90-ARCHIVE']
tasks: [compare-version, select-reference, preserve-provenance]
audiences: [curator, creator, verifier]
tags: [editions, history, comparison, provenance]
keywords: [variant, duplicate, succession, hash]
aliases: [edition index, historical variants]
source_refs: [LEGACY-KB-43-EDITIONS-V1, FORMATION-CANON-V1, MASTERCLASS-PLAYBOOKS-V1]
rights: APPROVED
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: [LEGACY-KB-43-EDITIONS-V1]
related_ids: [EVIDENCE-CORPUS-COMPLETENESS-V3, OPS-SOURCE-SELECTION-V3]
manifest_ref: 03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml
---

<kb_document>
<abstract>

# Abstract

Historical editions preserve evolution without creating competing authorities. S01, S03, S04, S05, and S07 have known variants; all are references until promoted through content, provenance, rights, and validity review. [METODOLOGIA][source_ref:LEGACY-KB-43-EDITIONS-V1]

</abstract>
<navigation>

# Index

1. Known variants
2. Comparison record
3. Selection rules
4. Acceptance

</navigation>
<routing>

# Routing

Use to select one historical comparison source. Use active Canon for definitions and the manifest for file identity.

</routing>
<knowledge>

# Known variants

S01 has an edition found within S13 inputs; S03 has Week/Morning/Afternoon editions; S04 has “Designing Excellence” and “Designed Excellence”; S05 has a “work without structure → high-performance ways of working” edition; S07 has an additional performance/yield edition. [METODOLOGIA]

For each comparison record Drive ID digest, bytes, content hash, date, audience, thesis, structure, visuals, claims, rights, and relationship to active canon. Equal title never proves duplication. Equal hash indicates one logical source with multiple provenance events. Different hash indicates a variant until content review establishes succession.

</knowledge>
<evidence>

# Evidence

Known variant labels come from the scoped Drive audit; equality and succession require portable digests and review.

</evidence>
<decisions>

# Decisions

Select a single edition because it fits teaching, visual study, narrative example, or historical comparison. Never select every version by default.

</decisions>
<assumptions>

# Assumptions

[SUPUESTO] Edition metadata remains linked to immutable content hashes.

</assumptions>
<limits>

# Limits

Folder order, title, file size, and recency alone do not establish authority.

</limits>
<edge_cases>

# Edge cases

If hashes differ only because of metadata, record `CONTENT_EQUIVALENCE_UNVERIFIED`. If a newer edition removes valuable material, preserve both and point Canon to the authoritative definition.

</edge_cases>
<acceptance>

# Acceptance

Every selected reference states purpose, exact identity, authority boundary, differences, and why other variants were excluded from the working set.

</acceptance>
<related_documents>

# Related documents

`EVIDENCE-CORPUS-COMPLETENESS-V3`, `REFERENCE-PDF-GALLERY-V3`, `OPS-SOURCE-SELECTION-V3`.

</related_documents>
<change_log>

# Change log

- v3.0: formalized edition identity, purpose-based selection, and metadata-only ambiguity.

</change_log>
</kb_document>
