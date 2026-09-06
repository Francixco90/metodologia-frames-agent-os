---
schema: knowledge-document-metadata-v1
document_id: ASSET-USAGE-V3
title: Brand Assets, Rights, and Usage Control
version: '3.0'
status: ACTIVE
authority: ASSET
layer: 50 Assets
language: en
response_locales: [en, es-419]
routes: ['R60-ASSET']
tasks: [resolve-asset, approve-usage, block-unlicensed-asset]
audiences: [creator, designer, verifier, publisher]
tags: [assets, rights, consent, hash-identity]
keywords: [logo, portrait, Pristino, allowed use, approval]
aliases: [asset manifest guide, brand asset control]
source_refs: [LEGACY-KB-50-ASSETS-V1, ASSET-REVIEW-V2, ART-GALLERY-V1]
rights: APPROVED
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: [LEGACY-KB-50-ASSETS-V1]
related_ids:
  [ASSET-REGISTRY-V3, CANON-NEO-SWISS-V3, EVIDENCE-CLAIMS-GAPS-V3, OPS-RECEIPTS-READBACK-V3]
manifest_ref: 03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml
---

<kb_document>
<abstract>

# Abstract

Assets are resolved by stable `asset_id` plus content SHA-256, then authorized for a specific use. A matching filename, visual similarity, source-folder location, or notebook presence does not establish identity, rights, consent, or approval. [METODOLOGIA][source_ref:ASSET-REVIEW-V2]

</abstract>
<navigation>

# Index

1. Asset classes and current controls
2. Resolution workflow
3. Failure modes
4. Acceptance

</navigation>
<routing>

# Routing

Use before any logo, portrait, mascot, photograph, or artistic reference enters a brief, Studio selection, postproduction, or release. Visual style routes to `CANON-NEO-SWISS-V3`; factual statements about people route to Evidence.

</routing>
<knowledge>

# Current control classes

- **Vector logo family:** symbol, positive lockup, and reverse lockup have stable IDs and hashes in the asset manifest. A separate, hash-bound approval receipt must confirm which masters and uses are active at execution time. Never generate, redraw, recolor, stretch, crop, or reconstruct the logo.
- **Derived raster logos:** use only when the receipt links the exact PNG hash to an approved SVG master and the delivery constraint requires raster. A derivative does not inherit approval automatically.
- **Javier portrait:** the reviewed manifest authorizes the exact hash only for team profile, founder bio, speaker card, and editorial content. It does not authorize invented attributes, endorsements, face modification, or unrelated campaigns. [METODOLOGIA][source_ref:ASSET-REVIEW-V2]
- **Katherine, Daniel, and Germán portraits:** remain `REVIEW` until consent and usage scope are evidenced.
- **Prístino and companion illustration:** remain `REVIEW`; neither is a corporate lockup.
- **ART-01–ART-08:** internal artistic references. They support pattern study, not republication or tracing.
- **Legacy square logo:** historical comparison only; never final production.

# Resolution workflow

1. Resolve request to `asset_id` and expected hash.
2. Recompute/read back the actual content hash.
3. Read current rights, consent, status, and `allowed_uses` from the authoritative manifest and approval receipt.
4. Compare the concrete use, audience, channel, geography, transformation, and publication state with the allowed scope.
5. Block any mismatch or unknown; do not substitute a similar asset.
6. Record the exact asset, hash, transformation, approval evidence, and rendered occurrence in the release receipt.

</knowledge>
<evidence>

# Evidence

Portable asset identity and reviewed states derive from `ASSET-REVIEW-V2`. Approval may be narrower or newer than that inventory, so the acting system must use the latest hash-bound receipt without storing private locators in versioned files. [METODOLOGIA][source_ref:ASSET-REVIEW-V2]

</evidence>
<decisions>

# Decisions

Asset control has veto over Content and Studio. Place logos and portraits in deterministic postproduction when generation would alter identity. Prefer omission over an unapproved substitute.

</decisions>
<assumptions>

# Assumptions

[SUPUESTO] Approval receipts can be resolved by digest at execution time. [SUPUESTO] The final renderer preserves the approved master without unintended conversion.

</assumptions>
<limits>

# Limits

This document does not itself grant a new right or consent. Notebook import is not publication permission. Brand ownership does not imply permission to use every person's likeness.

</limits>
<edge_cases>

# Edge cases

- Same person, different photo/hash: new asset review.
- Approved portrait, new generative transformation: new consent scope.
- Reverse logo on light background: select positive master rather than recoloring.
- Missing master at render time: block final status; never approximate.
- Asset embedded in a PDF: treat as reference unless separately resolved and authorized.

</edge_cases>
<acceptance>

# Acceptance

Every used asset has exact identity, current approval, permitted use matching the actual context, rights/consent evidence, correct rendition, and receipt traceability. All `REVIEW`, unknown, mismatched, or reconstructed assets are absent from final output.

</acceptance>
<related_documents>

# Related documents

`ASSET-REGISTRY-V3`, `CANON-NEO-SWISS-V3`, `EVIDENCE-CLAIMS-GAPS-V3`, `OPS-RECEIPTS-READBACK-V3`.

</related_documents>
<change_log>

# Change log

- v3.0: separated inventory from authorization, added use-context matching, derivative handling, and render-level readback.

</change_log>
</kb_document>
