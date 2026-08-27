---
schema: knowledge-document-metadata-v1
document_id: ASSET-REGISTRY-V3
title: Portable Brand Asset Registry
version: '3.0'
status: ACTIVE
authority: ASSET
layer: 50 Assets
language: en
response_locales: [en, es-419]
routes: ['R60-ASSET']
tasks: [resolve-asset, verify-hash, inspect-rights-state]
audiences: [creator, designer, verifier, publisher]
tags: [asset-registry, portable-identity, rights, consent]
keywords: [asset ID, SHA-256, logo master, portrait, allowed use]
aliases: [portable asset manifest, logo and portrait registry]
source_refs: [ASSET-REVIEW-V2, LEGACY-KB-50-ASSETS-V1]
rights: APPROVED
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: [LEGACY-KB-50-ASSETS-V1]
related_ids: [ASSET-USAGE-V3, CANON-NEO-SWISS-V3, EVIDENCE-CORPUS-COMPLETENESS-V3]
manifest_ref: 03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml
---

<kb_document>
<abstract>

# Abstract

This registry exposes portable asset identities, review states, and bounded uses without storing private locators. It supports resolution and blocking; it does not grant new approval or replace a current rights receipt. [METODOLOGIA][source_ref:ASSET-REVIEW-V2]

</abstract>
<navigation>

# Index

1. Logo family
2. People and characters
3. Runtime resolution
4. Limits and acceptance

</navigation>
<routing>

# Routing

Use this registry to resolve a requested asset to a stable ID and expected content hash. Then use `ASSET-USAGE-V3` to evaluate the actual audience, channel, transformation, geography, and publication state. A `REVIEW`, candidate, or historical state fails closed.

</routing>
<knowledge>

# Logo family

| Asset ID                              | Format | Expected SHA-256                                                   | Current state              | Allowed use                 |
| ------------------------------------- | ------ | ------------------------------------------------------------------ | -------------------------- | --------------------------- |
| `AST-METODOLOGIA-SYMBOL-SVG`          | SVG    | `c5f61d882485b3b718654529b7ae62d923ea32142025389c23985471372e7aa6` | `READY_FOR_HUMAN_APPROVAL` | None yet                    |
| `AST-METODOLOGIA-LOCKUP-POSITIVE-SVG` | SVG    | `c0958b6a18e791651e5c237328c4350af8bf3c8d1225aa9f96926389250ec927` | `READY_FOR_HUMAN_APPROVAL` | None yet                    |
| `AST-METODOLOGIA-LOCKUP-REVERSE-SVG`  | SVG    | `40dc02db27ad128b1b84026163a0116efe7ed278821b84e881f035c9aa4cd529` | `READY_FOR_HUMAN_APPROVAL` | None yet                    |
| `AST-METODOLOGIA-LOCKUP-POSITIVE-PNG` | PNG    | `46c8c13686c8f9fd4c48c9ce75bf3bb65689a1085fdec9cd0e2c26384f78ed3b` | `READY_FOR_HUMAN_APPROVAL` | None yet; derived candidate |
| `AST-METODOLOGIA-SYMBOL-PNG`          | PNG    | `cb93a22d5552755a4b05858f8693db060a3be14dd19bd58991a0bc6863165b3f` | `READY_FOR_HUMAN_APPROVAL` | None yet; derived candidate |
| `AST-METODOLOGIA-LEGACY-SQUARE-PNG`   | PNG    | `938b6e675c04d0c4a52895eb8e092d8c72e835ef9c52a6dd4e28d7c476ab726a` | `DO_NOT_USE_FINAL`         | Historical comparison only  |

The three SVG records are candidate masters, not approved masters. `ASSET_CANON_APPROVED` plus a current hash-bound receipt is required before postproduction uses one. Raster derivatives never expand the SVG's permission.

# People and characters

| Asset ID                                 | Subject or role                 | Expected SHA-256                                                   | Current state | Allowed use                                                |
| ---------------------------------------- | ------------------------------- | ------------------------------------------------------------------ | ------------- | ---------------------------------------------------------- |
| `AST-PORTRAIT-JAVIER-MONTANO`            | Javier Montaño                  | `4cac6ea8b4e303c1e0a27573736114f46ffb1b8783745d1ac1335b4f02da756d` | `APPROVED`    | Team profile, founder bio, speaker card, editorial content |
| `AST-PORTRAIT-KATHERINE-OQUENDO`         | Katherine Oquendo Lopera        | `493e6da2ffaa9ca65d7379f9ca64b0acc96ab384048a464b7fe7de22a0d237a3` | `REVIEW`      | None                                                       |
| `AST-PORTRAIT-DANIEL-ZULUAGA`            | Daniel Felipe Zuluaga Marulanda | `6f3ecf26f043e554bea735e03706be1e1ca5f41cd9d9ed07f1353b060df2d1f7` | `REVIEW`      | None                                                       |
| `AST-PORTRAIT-GERMAN-SEPULVEDA`          | Germán Sepúlveda Barbosa        | `35547326e603349f6f22bc4a5d460d41c82915568b1917a20d72dafa66dc6ba1` | `REVIEW`      | None                                                       |
| `AST-PRISTINO-MASCOT-CANDIDATE`          | Prístino candidate              | `5530750d714aeeead6689361eb6f7ea413581696432e4c7d0c4cd124ce751342` | `REVIEW`      | None                                                       |
| `AST-METODOLOGIA-COMPANION-ILLUSTRATION` | Companion illustration          | `fc0a47696d88d68ade25da7e70cdbd551c041194953a7449b108415cfddb3e87` | `REVIEW`      | None                                                       |

Javier's approval applies only to the four listed contexts and the exact hash. It does not authorize face alteration, an invented endorsement, a different portrait, or a public use outside that list.

# Runtime resolution

1. Resolve the requested asset ID.
2. Resolve bytes at runtime without persisting the private locator.
3. Recompute SHA-256 and compare it with this registry.
4. Read the latest approval or consent receipt; newer evidence may narrow or supersede this snapshot.
5. Match the concrete use against `allowed_uses`.
6. Record asset ID, actual hash, receipt digest, transformation, occurrence, and final state.

</knowledge>
<evidence>

# Evidence

The identities, hashes, dimensions, lineage, and review states are migrated from the read-only `ASSET-REVIEW-V2` inventory. [METODOLOGIA][source_ref:ASSET-REVIEW-V2]

</evidence>
<decisions>

# Decisions

- Publish portable hashes and states, never private paths.
- Keep candidate logos blocked until owner approval, even when they are visually stronger than historical assets.
- Omit an asset rather than substitute a similar file or infer consent.

</decisions>
<assumptions>

# Assumptions

[SUPUESTO] Runtime operators can resolve the expected bytes through an authorized private channel. [SUPUESTO] No newer rights receipt has narrowed an approved use.

</assumptions>
<limits>

# Limits

This registry is a dated snapshot. It does not contain the asset bytes, private locators, consent documents, or a current `ASSET_CANON_APPROVED` token. Notebook presence cannot convert a candidate into an approved production asset.

</limits>
<edge_cases>

# Edge cases

- Same asset ID with a different hash: block as identity drift.
- Same hash under several filenames: one logical asset, not several approvals.
- Same subject with a new portrait: new identity and consent review.
- Approved source file transformed by generation: new derivative and new use review.
- Missing latest receipt: preserve the registry state but block use.

</edge_cases>
<acceptance>

# Acceptance

Resolution passes only when asset ID, expected and actual hashes, current state, concrete allowed use, approval evidence, and transformation all agree. Any unresolved field returns `BLOCKED_ASSET_RIGHTS`.

</acceptance>
<related_documents>

# Related documents

`ASSET-USAGE-V3`, `CANON-NEO-SWISS-V3`, `EVIDENCE-CORPUS-COMPLETENESS-V3`.

</related_documents>
<change_log>

# Change log

- v3.0: migrated portable identities and states, removed private locators, and separated asset resolution from authorization.

</change_log>
</kb_document>
