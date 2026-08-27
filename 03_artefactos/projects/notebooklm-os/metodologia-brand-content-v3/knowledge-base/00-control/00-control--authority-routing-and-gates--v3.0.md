---
schema: knowledge-document-metadata-v1
document_id: CTRL-AUTHORITY-ROUTER-V3
title: Authority Routing and Gates
version: '3.0'
status: ACTIVE
authority: CONTROL
layer: 00 Control
language: en
response_locales: [en, es-419]
routes: ['R00-GOVERN']
tasks: [resolve-conflict, apply-gate, assign-state, stop-safely]
audiences: [conductor, operator, curator, verifier, guardian]
tags: [authority, routing, gates, lifecycle, fail-closed]
keywords: [precedence, veto, receipt, readback, rollback]
aliases: [governance control, route and gate authority]
source_refs: [CTRL-SYSTEM-PROMPT-V3, CTRL-KNOWLEDGE-MAP-V3]
rights: APPROVED
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: [LEGACY-KB-01-AUTHORITY-V1, LEGACY-KB-02-ROUTING-V2]
related_ids: [CTRL-BOOTSTRAP-V3, CTRL-KB-STANDARD-V3]
manifest_ref: 03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml
---

<kb_document>
<abstract>

# Abstract

This control determines which source may decide, which route may act, which gate is required, and which state can be claimed. It separates editorial production from verification, approval, sharing, publication, and destructive operations. [METODOLOGIA][source_ref:CTRL-SYSTEM-PROMPT-V3]

</abstract>
<navigation>

# Index

1. Authority and veto
2. Route boundaries
3. Gates and lifecycle
4. Stop rules and recovery

</navigation>
<routing>

# Route boundaries

A route owns a decision type, not the whole request. `R40-CREATE` designs content and a brief; `R70-STUDIO` operates Studio; `R60-ASSET` authorizes asset use; `R00-GOVERN` resolves state and conflicts. A mixed request chains routes and preserves each authority.

Route selection records primary route, support routes, purpose, audience, effect, sensitivity, output, source policy, and next gate. A route may hand off but may not grant another route's authorization.

</routing>
<knowledge>

# Authority and lifecycle

## Precedence

1. `00 Control`: behavior, routing, precedence, gates, state, and standards.
2. `10 Canon`: approved method, identity, voice, visual system, and curriculum.
3. `20 Evidence`: provenance, claims, freshness, contradictions, and gaps.
4. `30 Templates`: format-specific input and output contracts.
5. `50 Assets`: masters, hashes, consent, rights, and permitted use.
6. `60 Operations`: naming, manifests, identity, receipts, and recovery.
7. `70 Pedagogy`: teaching, practice, assessment, and transfer.
8. `40 References`: patterns and examples that inspire without governing.
9. `80 Working`: temporary task sources.
10. `90 Archive`: historical or superseded material.

`50 Assets` has transversal veto. No control, canon, template, PDF, reference, brief, or user request can invent rights or expand an approved use. A human owner decision can approve only when represented in the asset authority and receipt.

Within one authority, a successor must be active, identify what it supersedes, and resolve to a verified manifest entry. Otherwise both versions remain a conflict. PDFs do not defeat active Markdown. Generated artifacts never become canon without an explicit promotion process.

## Gates

| Effect                                                            | Required gate                    | Scope                                 |
| ----------------------------------------------------------------- | -------------------------------- | ------------------------------------- |
| Create notebook, save instructions, create labels, import sources | `NLM_PLAN_APPROVED`              | exact plan and target                 |
| Synchronize a Drive source                                        | `NLM_SYNC_APPROVED`              | exact source set                      |
| Generate one Studio artifact                                      | `NLM_STUDIO_GENERATION_APPROVED` | one brief and one attempt             |
| Apply a logo, portrait, or image                                  | `ASSET_CANON_APPROVED`           | exact asset ID and allowed use        |
| Invite, expose, or make public                                    | `NLM_SHARE_AUTHORIZED`           | one resolved sharing effect           |
| Delete source, note, label, artifact, or notebook                 | `NLM_DESTRUCTIVE_AUTHORIZED`     | resolved targets and readback         |
| Editorial approval                                                | `HUMAN_APPROVED`                 | exact artifact version                |
| Publication                                                       | `PUBLISH_AUTHORIZED`             | exact channel, bytes, and destination |

Approval of a plan does not authorize Studio. Studio authorization does not authorize a successor attempt. Editorial approval does not authorize sharing or publication. Each external mutation emits a receipt containing actor, gate, targets, before state, after readback, hashes, gaps, and next gate.

## States

- `DRAFT`: content or plan exists but is not rendered.
- `RENDERED_DRAFT`: bytes or rendered output exist and remain unverified.
- `STUDIO_RAW`: provider output preserved before postproduction and full QA.
- `VERIFIED_DRAFT`: defined technical and editorial checks passed; no human approval implied.
- `HUMAN_APPROVED`: named reviewer approved the exact version.
- `READY`: all release conditions for a named destination passed.
- `PUBLISHED`: destination readback proves public or recipient-visible publication.
- `BLOCKED`: a named rule prevents safe progress.
- `UNKNOWN`: external state cannot be resolved and success must not be claimed.

Automatic work cannot exceed `VERIFIED_DRAFT`.

## Stop and recovery rules

- Identity mismatch, unexpected visibility, wrong owner, or ambiguous target: stop before mutation.
- Timeout or ambiguous provider response: read back before retrying.
- Missing evidence for a required claim: omit or block; never invent.
- Unknown asset rights: block visual use.
- Empty or all-sources request: `BLOCKED_ALL_SOURCES` and propose a bounded set.
- Duplicate idempotency key: return the existing active or verified artifact.
- Destructive target not resolved by stable ID and readback: do not delete.

</knowledge>
<evidence>

# Evidence

- [METODOLOGIA][source_ref:CTRL-SYSTEM-PROMPT-V3] Planning, generation, verification, approval, sharing, publication, and readback are distinct effects.
- [INFERENCIA][source_ref:CTRL-KNOWLEDGE-MAP-V3] Explicit route ownership reduces accidental authority fusion in mixed requests.

</evidence>
<decisions>

# Decisions

- Gate tokens are exact, scoped, and non-transferable.
- Provider success messages are insufficient without readback.
- `UNKNOWN` blocks retries that could duplicate or overwrite external state.

</decisions>
<assumptions>

# Assumptions

- [SUPUESTO] The adapter can bind approval evidence to a plan, brief, asset, or target digest.
- [SUPUESTO] Human approvals name an actor and exact artifact hash.

</assumptions>
<limits>

# Limits

This document specifies authorization semantics but contains no approval token and grants no permission. It cannot inspect provider state, assets, or publication destinations by itself.

</limits>
<edge_cases>

# Edge cases

- One brief requests two Studio artifacts: split into two authorizations and receipts.
- A reviewer approves PDF but PPTX changes afterward: approval does not transfer.
- A title matches an existing notebook but identity is uncertain: stable ID and visibility readback decide.
- A source already exists under a different title with the same content hash: reuse it and record the alias.

</edge_cases>
<acceptance>

# Acceptance criteria

- Every planned effect maps to one exact gate or is read-only.
- Every claimed mutation has post-effect readback and a hash-bound receipt.
- No automatic path produces `HUMAN_APPROVED`, `READY`, or `PUBLISHED`.
- Conflict and timeout fixtures stop without duplicate or destructive effects.

</acceptance>
<related_documents>

# Related documents

`CTRL-SYSTEM-PROMPT-V3`, `CTRL-KNOWLEDGE-MAP-V3`, `CTRL-KB-STANDARD-V3`, Operations controls, and asset authority.

</related_documents>
<change_log>

# Change log

- 2026-08-26: v3.0 unified authority, source boundaries, exact gates, lifecycle states, and recovery rules.

</change_log>
</kb_document>
