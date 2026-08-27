---
schema: prompt-template-v1
template_id: channel-commercial-proposal-deck
kind: channel
version: 1.0.0
status: candidate
---
<prompt_template>
<abstract>Compile a qualified commercial story from an evidenced problem to a bounded offer.</abstract>
<routing>Use for a proposal or sales deck; use executive-deck for an internal decision.</routing>
<inputs>audience; problem; offer; locale; slide count; commercial boundaries</inputs>
<source_selection>Bind control, canon, approved offer/claim evidence, template and approved assets.</source_selection>
<output_contract>Context, problem, impact, approach, offer, proof, boundaries, plan and next step.</output_contract>
<negative_prompt>No invented client facts, unapproved pricing, guaranteed outcome or false urgency.</negative_prompt>
<acceptance>Problem-offer fit, qualified claims, explicit limits and actionable next step.</acceptance>
<idempotency>Hash normalized intent, template version, locale, profile and ordered source set.</idempotency>
</prompt_template>
