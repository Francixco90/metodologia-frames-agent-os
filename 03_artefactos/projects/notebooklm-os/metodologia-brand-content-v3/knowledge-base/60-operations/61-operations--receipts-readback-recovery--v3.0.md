---
schema: knowledge-document-metadata-v1
document_id: OPS-RECEIPTS-READBACK-V3
title: Receipts, Readback, Idempotency, and Recovery
version: '3.0'
status: ACTIVE
authority: OPERATIONAL
layer: 60 Operations
language: en
response_locales: [en, es-419]
routes: ['R00-GOVERN', 'R80-AUDIT']
tasks: [plan-mutation, record-receipt, verify-readback, resume-operation]
audiences: [notebook-operator, verifier, guardian]
tags: [receipts, readback, idempotency, recovery, gates]
keywords: [mutation, external effect, digest, rollback, state]
aliases: [operation receipt rules, recovery rules]
source_refs: [LEGACY-KB-60-OPERATIONS-V1, LEGACY-KB-61-MIGRATION-V1-1]
rights: APPROVED
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: [LEGACY-KB-60-OPERATIONS-V1, LEGACY-KB-61-MIGRATION-V1-1]
related_ids: [CTRL-AUTHORITY-ROUTER-V3, OPS-SOURCE-SELECTION-V3, ASSET-USAGE-V3]
manifest_ref: 03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml
---

<kb_document>
<abstract>

# Abstract

An external action is proven by a scoped authorization, resolved targets, observed result, and independent readback—not by a plan, tool call, timeout, visible draft, or local file. Receipts preserve portable digests while private locators remain outside version control. [METODOLOGIA][source_ref:LEGACY-KB-60-OPERATIONS-V1]

</abstract>
<navigation>

# Index

1. Gate map
2. Receipt and readback
3. Resume and recovery
4. Acceptance

</navigation>
<routing>

# Routing

Use for every notebook or Studio mutation and status transition. Use Control for the exact current gate names and authorization scope.

</routing>
<knowledge>

# Gate map

- Read/audit/plan: no mutation gate.
- Create/configure notebook or import sources: `NLM_PLAN_APPROVED`.
- Sync Drive sources: `NLM_SYNC_APPROVED`.
- Generate one Studio artifact: single-use `NLM_STUDIO_GENERATION_APPROVED`.
- Invite/share/publish: separate `NLM_SHARE_AUTHORIZED` with resolved audience and visibility.
- Delete any notebook/source/note/artifact: `NLM_DESTRUCTIVE_AUTHORIZED`, resolved targets, rollback where possible, and post-delete readback. [METODOLOGIA]

# Mutation receipt

Record operation ID, time, actor, intent/plan hash, target identity digest, single-use gate, ordered operations, before-state digest, result per operation, after-state/readback, source and artifact hashes, gaps, rollback result, and next gate. Private notebook/source/artifact IDs and URLs remain only in approved private state; versioned receipts contain portable digests.

# Readback and recovery

After creation, configuration, import, sync, Studio generation, sharing, or deletion, re-read title, privacy, counts, source identities, artifact status/bytes, and collaborator/visibility state as applicable. On timeout or interrupted response, assume the side effect is unknown: read back before retry. Resume from the receipt and idempotency key; reuse an existing matching object rather than creating a duplicate.

Status chain: `DRAFT` → `RENDERED_DRAFT` → `VERIFIED_DRAFT` → `HUMAN_APPROVED` → `READY` → `PUBLISHED`. Each transition needs its own evidence; no stage implies the next. [METODOLOGIA]

</knowledge>
<evidence>

# Evidence

Migration evidence from Canon v2 is portable but partial: three origin assets remained unresolved and the notebook projection did not establish complete origin parity. This history is a recovery input, not authority for v3. [METODOLOGIA][source_ref:LEGACY-KB-61-MIGRATION-V1-1]

</evidence>
<decisions>

# Decisions

Never retry a possibly successful mutation blindly. Never infer sharing, publication, delivery, or deletion from a UI snapshot. Preserve raw and successor artifacts without overwrite.

</decisions>
<assumptions>

# Assumptions

[SUPUESTO] The provider exposes enough state to perform readback. If it does not, mark the effect `UNKNOWN` and block promotion.

</assumptions>
<limits>

# Limits

A receipt records evidence but does not retroactively authorize an effect. Digest-only versioned records cannot be used to access private objects.

</limits>
<edge_cases>

# Edge cases

- Tool returns success but readback differs: `PARTIAL` or `BLOCKED`, never completed.
- Identical title but different object: resolve by digest/provider ID.
- Artifact reports complete but has zero or unreadable bytes: generation not verified.
- Human approval arrives after source drift: reverify affected claims/assets before promotion.

</edge_cases>
<acceptance>

# Acceptance

Every mutation has valid scoped authorization, resolved targets, before/after evidence, no unintended duplicates, correct privacy, portable receipt, and explicit next gate. Any unknown effect remains blocked.

</acceptance>
<related_documents>

# Related documents

`CTRL-AUTHORITY-ROUTER-V3`, `OPS-SOURCE-SELECTION-V3`, `ASSET-USAGE-V3`.

</related_documents>
<change_log>

# Change log

- v3.0: unified gates, portable receipts, timeout recovery, stage separation, and unknown-effect handling.

</change_log>
</kb_document>
