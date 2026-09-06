---
schema: knowledge-document-metadata-v1
document_id: EVIDENCE-CLAIMS-GAPS-V3
title: Claims, Provenance, and Coverage Gaps
version: '3.0'
status: ACTIVE
authority: EVIDENCE
layer: 20 Evidence
language: en
response_locales: [en, es-419]
routes: ['R50-RESEARCH', 'R80-AUDIT']
tasks: [classify-claim, verify-claim, disclose-gap]
audiences: [creator, editor, verifier, executive]
tags: [claims, provenance, validity, coverage-gap]
keywords: [strong claim, evidence tag, source reference, time-sensitive]
aliases: [claims ledger, evidence rules]
source_refs: [LEGACY-KB-20-EVIDENCE-V1, LEGACY-KB-21-AUDIT-V1-1]
rights: APPROVED
validity: {valid_from: '2026-08-26', valid_until: null}
supersedes: [LEGACY-KB-20-EVIDENCE-V1]
related_ids: [CTRL-AUTHORITY-ROUTER-V3, CANON-OPERATING-METHOD-V3, ASSET-USAGE-V3]
manifest_ref: 03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml
---

<kb_document>
<abstract>

# Abstract

This ledger prevents educational, historical, or promotional language from becoming an external claim without adequate authority, provenance, scope, and validity. Evidence tags classify a statement; `source_ref` enables traceability. Neither alone proves truth. [METODOLOGIA][source_ref:LEGACY-KB-20-EVIDENCE-V1]

</abstract>
<navigation>

# Index

1. Claim classes
2. Allowed and blocked claims
3. Verification workflow
4. Acceptance

</navigation>
<routing>

# Routing

Route every strong factual, causal, comparative, quantified, legal, rights, product, or personal claim here before external content. Brand and method definitions may route to Canon but must be described as MetodologIA positions.

</routing>
<knowledge>

# Claim classes

- `[METODOLOGIA]`: owner-defined method, brand rule, operational decision, or documented observation.
- `[PEDAGOGIA]`: instructional design choice or learning interpretation supported by identified pedagogy sources.
- `[NEUROCIENCIA]`: neuroscience claim supported by identifiable specialist evidence; absent that evidence, do not apply this tag.
- `[INFERENCIA]`: conclusion derived from cited observations; state the reasoning boundary.
- `[SUPUESTO]`: premise accepted for execution but not established as fact.
- `coverage_gap`: missing, ambiguous, stale, conflicting, or inaccessible evidence.

# Allowed methodology statements

“Method first, technology second”; “AI amplifies while humans direct and remain accountable”; “productivity is materializing intention rather than accumulating activity”; and “excellence is designed through specification, evaluation, and iteration” may describe MetodologIA's approach. They must not be framed as scientific universals. [METODOLOGIA][source_ref:CANON-OPERATING-METHOD-V3]

# Blocked unsupported external claims

Do not publish the historical multipliers `5x`, `7x`, `10x–100x`, `17x`, `280x`; percentages `30%`, `40%`, `50–60%`, `60%`, `80%`, `90%`; “one hour saves ten”; graduate-level cognitive equivalence; or causal promises about income, freedom, wellbeing, quality, adoption, or competitive advantage without a current primary source and valid scope. Their presence in a PDF or transcript is historical evidence, not factual support. [METODOLOGIA][source_ref:LEGACY-KB-20-EVIDENCE-V1]

Prices, quotas, model capabilities, product names, regional availability, privacy terms, benchmarks, and technical protocols expire quickly and require official-source verification at the moment of use. Rights and consent require an asset receipt, not an inference from file possession.

</knowledge>
<evidence>

# Verification record

For each strong claim record: `claim_id`, exact wording, claim type, source ID, source authority, publication/update date, applicable region/audience, conditions, contradiction status, checked date, and reviewer. When no adequate source exists, narrow or remove the claim and record the gap.

</evidence>
<decisions>

# Decisions

Prefer a narrower accurate statement over an impressive unsupported one. Primary official sources govern current product facts; active owner canon governs brand definitions; specialist sources govern science and pedagogy.

</decisions>
<assumptions>

# Assumptions

[SUPUESTO] Source metadata is accurate until readback detects a discrepancy. [SUPUESTO] “Official” does not eliminate the need to check date, region, and conditions.

</assumptions>
<limits>

# Limits

This ledger is not a substitute for legal, medical, financial, scientific, or pedagogical review. It does not validate claims merely by listing them.

</limits>
<edge_cases>

# Edge cases

- Two sources agree but cite the same unsupported origin: still one weak evidence chain.
- A claim is true in one country or plan: preserve the region and plan condition.
- A historical quote contains a blocked metric: quote only when necessary and label it unverified.
- A person appears in content: do not infer role, consent, identity attributes, or endorsement.

</edge_cases>
<acceptance>

# Acceptance

Every strong external claim is traceable to a fit-for-purpose source with date, scope, and conditions; methodology, inference, and assumptions are distinguishable; unresolved conflicts and gaps remain visible; unsupported claims are blocked.

</acceptance>
<related_documents>

# Related documents

`CTRL-AUTHORITY-ROUTER-V3`, `CANON-OPERATING-METHOD-V3`, `ASSET-USAGE-V3`.

</related_documents>
<change_log>

# Change log

- v3.0: formalized claim classes, evidence records, shared-origin failure, and current-source requirements.

</change_log>
</kb_document>
