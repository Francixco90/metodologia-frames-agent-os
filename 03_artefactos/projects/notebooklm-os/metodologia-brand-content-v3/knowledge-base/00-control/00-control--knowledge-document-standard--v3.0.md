---
schema: knowledge-document-metadata-v1
document_id: CTRL-KB-STANDARD-V3
title: Canon v3 Knowledge Document Standard
version: '3.0'
status: ACTIVE
authority: CONTROL
layer: 00 Control
language: en
response_locales: [en, es-419]
routes: ['R00-GOVERN']
tasks: [author-document, validate-document, maintain-index, supersede-document]
audiences: [knowledge-architect, curator, editor, verifier]
tags: [document-standard, metadata, xml-sandwich, indexing, evidence]
keywords: [frontmatter, abstract, navigation, source refs, anchors]
aliases: [Markdown knowledge standard, Canon v3 document format]
source_refs: [CTRL-AUTHORITY-ROUTER-V3, CTRL-KNOWLEDGE-MAP-V3]
rights: APPROVED
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: []
related_ids: [CTRL-SYSTEM-PROMPT-V3]
manifest_ref: 03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml
---

<kb_document>
<abstract>

# Abstract

This standard makes each Canon v3 Markdown source independently understandable, searchable, routable, traceable, and testable. YAML supports deterministic indexing; an XML sandwich separates semantic sections; Markdown headings preserve human navigation and retrieval anchors. [METODOLOGIA][source_ref:CTRL-KNOWLEDGE-MAP-V3]

</abstract>
<navigation>

# Index

1. Required metadata
2. XML sandwich and writing rules
3. Evidence and links
4. Indexing, succession, and validation

</navigation>
<routing>

# When to apply

Apply this standard to every active Markdown imported into Canon v3. Historical binary PDFs and images remain governed by manifests and companion Markdown; they do not need this wrapper. A Markdown that fails this standard cannot enter the active source set.

</routing>
<knowledge>

# KnowledgeDocumentMetadataV1

## Required YAML front matter

Every active document begins with one YAML block containing exactly the following public contract fields, plus documented extension fields when a subsystem requires them:

- `schema`: exactly `knowledge-document-metadata-v1`.
- `document_id`: stable uppercase or lowercase alphanumeric and hyphen identifier; never a filename, URL, locator, or mutable title.
- `title`: concise human title.
- `version`: quoted semantic version.
- `status`: `ACTIVE`, `SUPERSEDED`, `REVIEW`, or `BLOCKED`; only `ACTIVE` is imported by default.
- `authority`: one declared authority class such as `CONTROL`, `CANON`, `EVIDENCE`, `TEMPLATE`, `ASSET`, `OPERATIONS`, `PEDAGOGY`, or `REFERENCE`.
- `layer`: one controlled layer label.
- `language`: source language as a BCP 47 tag.
- `response_locales`: subset of supported BCP 47 response tags; Canon v3 uses `[en, es-419]`.
- `routes`, `tasks`, `audiences`, `tags`, `keywords`, and `aliases`: bounded discovery terms without private data.
- `source_refs`: stable evidence or predecessor IDs used by substantive claims.
- `rights`: `APPROVED`, `REVIEW`, `RESTRICTED`, or `BLOCKED`.
- `validity`: `{valid_from: YYYY-MM-DD, valid_until: YYYY-MM-DD|null}`.
- `supersedes`: stable logical IDs, empty when none.
- `related_ids`: stable cross-document IDs that improve navigation.
- `manifest_ref`: full repository-relative path to the authoritative source manifest.

The content hash is never stored inside the file it hashes. The external manifest records normalized SHA-256, bytes, provenance, rights evidence, status, and remote identity.

Identifiers used by `document_id`, `routes`, `tasks`, and `tags` contain only letters, numbers, and hyphens. They avoid spaces, periods, underscores, accents, and provider-specific locators. Titles, keywords, and aliases remain natural language.

## Required XML sandwich

After front matter, the document contains one `kb_document` XML root with these sections exactly once and in this order:

1. `abstract`: a decision-oriented summary that states what the document governs and why it matters.
2. `navigation`: a short index matching the document's real sections.
3. `routing`: intents, routes, source dependencies, handoffs, and blocking conditions.
4. `knowledge`: the reusable subject matter, rules, models, and procedures.
5. `evidence`: strong claims with tags and resolvable source references.
6. `decisions`: selected choices and meaningful trade-offs.
7. `assumptions`: unverified premises labeled `[SUPUESTO]` or reasoned conclusions labeled `[INFERENCIA]`.
8. `limits`: scope boundaries, non-capabilities, and temporal constraints.
9. `edge_cases`: failure, ambiguity, conflict, and recovery behavior.
10. `acceptance`: observable checks that allow verification.
11. `related_documents`: stable IDs and the reason each relation matters.
12. `change_log`: dated, concise material changes.

Markdown headings live inside XML sections. Use one H1 per semantic section and H2 or H3 for subsections. Headings are descriptive and stable enough to produce meaningful anchors. Do not place YAML, HTML comments, hidden instructions, or another root outside the sandwich.

## Writing rules

- Write active knowledge in clear international English; route output to the user's language.
- Put the conclusion or operational rule before explanation.
- Give each paragraph one job and each list one organizing principle.
- Add only evidence, decisions, assumptions, limits, criteria, or examples that change action.
- Remove duplicated cross-cutting rules; link to their controlling `document_id` instead.
- Use exact terms consistently. Define acronyms on first use.
- For Spanish examples use neutral `es-419`, address the reader as `tú`, and avoid voseo.
- Do not include chain-of-thought, secrets, PII, private locators, unapproved commercial data, or unsupported superlatives.

## Evidence syntax

A strong statement includes an evidence tag and adjacent reference, for example: `[METODOLOGIA][source_ref:CANON-OPERATING-METHOD-V3]`. External sources use a stable manifest ID rather than a bare URL. Tags classify the basis; the reference carries provenance. Claims without adequate support become `[INFERENCIA]`, `[SUPUESTO]`, or `coverage_gap` rather than fact.

## Indexing strategy

Indexers use `document_id` as the primary key and build facets from authority, layer, language, routes, tasks, audiences, tags, keywords, aliases, source refs, and related IDs. Search order is exact ID, alias, route and task match, tag match, keyword match, then semantic body retrieval. The knowledge map routes intent before full-text search.

Avoid tag inflation: use three to eight discriminating tags and no synonym repeated as both tag and task without a routing reason. Keywords improve topical recall; aliases capture likely user language; related IDs form deliberate graph edges. The abstract must stand alone in search results.

## Succession

A successor uses a new version, keeps the logical subject stable, lists predecessor IDs in `supersedes`, explains material changes, and enters the manifest before activation. The predecessor becomes `SUPERSEDED` but remains immutable historical evidence. Two active sources that claim the same logical unit are a blocking conflict.

</knowledge>
<evidence>

# Evidence

- [METODOLOGIA][source_ref:CTRL-AUTHORITY-ROUTER-V3] Stable IDs and explicit succession prevent filenames and titles from deciding authority.
- [INFERENCIA][source_ref:CTRL-KNOWLEDGE-MAP-V3] Front matter plus sectioned prose supports both deterministic filtering and semantic retrieval.

</evidence>
<decisions>

# Decisions and trade-offs

- Use YAML for machine-readable metadata and XML for semantic boundaries; Markdown remains the readable surface.
- Store hashes externally to avoid self-referential documents.
- Require the complete sandwich even for short active documents so validators and retrieval behave consistently.
- Keep the schema strict but allow subsystem extension fields such as `json_registry_ref` when a governing schema validates them.

</decisions>
<assumptions>

# Assumptions

- [SUPUESTO] NotebookLM preserves enough plain text from YAML, XML, and Markdown to support semantic retrieval.
- [INFERENCIA] Deterministic metadata validation reduces ambiguity but does not prove factual correctness.

</assumptions>
<limits>

# Limits

This format cannot guarantee provider retrieval, factual truth, rights, or current validity. Those properties depend on the manifest, evidence, adapter behavior, readback, and periodic review.

</limits>
<edge_cases>

# Edge cases

- A document has useful content but invalid metadata: keep it in review and exclude it from active import.
- A source cannot be translated without changing authority: preserve the original evidence and create an explicitly derived English synthesis.
- XML-sensitive characters in prose: encode ampersand and angle brackets or place examples in safe text; validators must parse the root.
- A heading changes and breaks an external anchor: retain an alias or update all related links in the same versioned change.

</edge_cases>
<acceptance>

# Acceptance criteria

- Front matter parses and contains every required field with allowed values.
- XML is balanced, has one root, and contains all twelve sections once in order.
- Abstract, navigation, routing, evidence, limits, edge cases, acceptance, and relationships are materially populated.
- Every strong claim has a tag and source reference or an explicit gap.
- IDs, links, related documents, and manifest references resolve.
- No active source is superseded, expired, rights-blocked, or a competing logical authority.

</acceptance>
<related_documents>

# Related documents

`CTRL-KNOWLEDGE-MAP-V3` defines retrieval; `CTRL-AUTHORITY-ROUTER-V3` defines authority; the manifest carries hashes and source identity; `prompt.registry.v1` governs template extensions.

</related_documents>
<change_log>

# Change log

- 2026-08-26: v3.0 establishes strict metadata, XML sandwich, evidence syntax, index facets, and succession behavior.

</change_log>
</kb_document>
