---
schema: prompt-template-v1
template_id: channel-executive-deck
kind: channel
version: 1.0.0
status: candidate
---
<prompt_template>
<abstract>Compile a decision-led executive narrative that exposes evidence, trade-offs and the next gate.</abstract>
<routing>Use for leadership decisions; use commercial-proposal-deck for an offer.</routing>
<inputs>audience; decision; locale; slide count; time budget</inputs>
<source_selection>Bind control, canon, evidence, template, approved assets and at most two references.</source_selection>
<output_contract>Exact slides: situation, insight, options, trade-offs, recommendation, risks and ask.</output_contract>
<negative_prompt>No data dump, unsupported ROI, decorative slides or hidden assumptions.</negative_prompt>
<acceptance>Decision framing, evidence chain, explicit trade-offs and clear next gate.</acceptance>
<idempotency>Hash normalized intent, template version, locale, profile and ordered source set.</idempotency>
</prompt_template>
