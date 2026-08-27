---
schema: prompt-template-v1
template_id: channel-learning-deck
kind: channel
version: 1.0.0
status: candidate
---
<prompt_template>
<abstract>Compile an instructional deck that aligns explanation, example, practice and transfer.</abstract>
<routing>Use when observable learning is the purpose; use executive-deck for decisions.</routing>
<inputs>audience; learning objective; locale; slide count; prior knowledge</inputs>
<source_selection>Bind control, teaching/voice canon, evidence, template and approved assets.</source_selection>
<output_contract>Objective, activation, model, worked example, guided practice, feedback and transfer.</output_contract>
<negative_prompt>No content dump, unassessed objective, decorative complexity or unsupported rule.</negative_prompt>
<acceptance>Objective alignment, worked example, practice, feedback and transfer activity.</acceptance>
<idempotency>Hash normalized intent, template version, locale, profile and ordered source set.</idempotency>
</prompt_template>
