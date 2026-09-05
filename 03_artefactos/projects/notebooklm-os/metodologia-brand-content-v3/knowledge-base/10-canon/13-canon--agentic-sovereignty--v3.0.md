---
schema: knowledge-document-metadata-v1
document_id: CANON-AGENTIC-SOVEREIGNTY-V3
title: Agentic Work and Digital Sovereignty
version: '3.0'
status: ACTIVE
authority: CANON
layer: 10 Canon
language: en
response_locales: [en, es-419]
routes: ['R00-GOVERN', 'R20-LEARN']
tasks: [choose-architecture, design-handoff, assess-autonomy]
audiences: [operator, architect, executive]
tags: [digital-sovereignty, agents, orchestration, human-in-the-loop]
keywords: [minimum privilege, guardian, context sharding, provider portability]
aliases: [agentic sovereignty, sovereign AI work]
source_refs:
  [LEGACY-KB-13-AGENTIC-V1, NFC-DRV-S12, NFC-DRV-S13, NFC-DRV-S14A, NFC-DRV-S14B, NFC-DRV-T20]
rights: APPROVED
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: [LEGACY-KB-13-AGENTIC-V1]
related_ids: [CANON-OPERATING-METHOD-V3, OPS-RECEIPTS-READBACK-V3, CTRL-AUTHORITY-ROUTER-V3]
manifest_ref: 03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml
---

<kb_document>
<abstract>

# Abstract

Digital sovereignty is the ability to preserve method, knowledge, evidence, and decision rights while changing tools. Autonomy is earned through bounded behavior and readback; it is not inferred from a system's complexity or marketing label. [METODOLOGIA][source_ref:LEGACY-KB-13-AGENTIC-V1]

</abstract>
<navigation>

# Index

1. Architecture ladder
2. Governed network
3. Threats and decisions
4. Acceptance

</navigation>
<routing>

# Routing

Use for conceptual choices about assistants, automations, agents, and networks. Route concrete permissions and gates to Control; route receipts to `OPS-RECEIPTS-READBACK-V3`.

</routing>
<knowledge>

# Architecture ladder

| Need                                                     | Minimum adequate architecture |
| -------------------------------------------------------- | ----------------------------- |
| One bounded output                                       | structured prompt             |
| Repeatable role/output                                   | assistant or skill            |
| Deterministic sequence                                   | pipeline/automation           |
| Dynamic objective plus tools                             | bounded agent                 |
| Independent specialties, parallel work, or material risk | minimal agent network         |

A governed network separates Lead/Conductor, bounded Specialists, and an independent Guardian when risk requires it. Every unit declares inputs, outputs, tools, authority, prohibited actions, acceptance, and stop rules. Handoffs carry state and evidence, not hidden reasoning. [METODOLOGIA]

# Control pattern

Use least privilege, allowlisted tools, scoped context, budgets, iteration limits, privacy and rights checks, human gates for material effects, append-only receipts, and external readback. Share the smallest context required; persistent memory must have owner, retention, and access rules.

</knowledge>
<evidence>

# Evidence

The architecture ladder is a MetodologIA decision heuristic, not proof that multi-agent systems outperform a single agent. Provider protocols and product compatibility are time-sensitive. [METODOLOGIA][source_ref:LEGACY-KB-13-AGENTIC-V1]

</evidence>
<decisions>

# Decisions

Choose the least complex architecture that satisfies independence, latency, quality, and risk needs. Keep source authority and portable manifests outside a provider notebook. Require plan visibility before material external action.

</decisions>
<assumptions>

# Assumptions

[SUPUESTO] Tool permissions can be bounded and side effects can be verified. If either assumption fails, reduce autonomy.

</assumptions>
<limits>

# Limits

Agent count is not a quality metric. A demo, scaffold, generated artifact, or green local check does not prove runtime, release, delivery, or publication readiness.

</limits>
<edge_cases>

# Edge cases

- If the producer must also verify, disclose reduced independence.
- If a timeout occurs after a mutation, read back before retrying.
- If authority or ownership is ambiguous, stop before mutation.
- If a provider disappears, reconstruct from source manifests and portable contracts.

</edge_cases>
<acceptance>

# Acceptance

An agentic design passes when it justifies architecture, scopes authority, identifies irreversible effects, separates producer and verifier when needed, records receipts, verifies external state, and defines escalation and rollback.

</acceptance>
<related_documents>

# Related documents

`CANON-OPERATING-METHOD-V3`, `OPS-SOURCE-SELECTION-V3`, `OPS-RECEIPTS-READBACK-V3`.

</related_documents>
<change_log>

# Change log

- v3.0: added minimum-architecture decision table, portable recovery, and explicit non-evidence boundaries.

</change_log>
</kb_document>
