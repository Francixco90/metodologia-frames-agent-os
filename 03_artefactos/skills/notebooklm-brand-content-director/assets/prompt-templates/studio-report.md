---
schema: prompt-template-v1
template_id: studio-report
kind: studio
version: 1.0.0
status: candidate
---
<prompt_template>
<abstract>Compile an evidence-grounded report organized around the reader's decision.</abstract>
<routing>Use for Studio report when a durable analytical document is requested.</routing>
<inputs>audience; objective; locale; target length; decision</inputs>
<source_selection>Bind control, voice canon, selected evidence and this template.</source_selection>
<output_contract>Executive summary, method, findings, limits, recommendations and source notes.</output_contract>
<negative_prompt>No unsupported conclusion, hidden assumption, invented metric or omitted limitation.</negative_prompt>
<acceptance>Traceable findings, explicit limits, useful recommendations and requested locale.</acceptance>
<idempotency>Hash normalized intent, template version, locale, profile and ordered source set.</idempotency>
</prompt_template>
