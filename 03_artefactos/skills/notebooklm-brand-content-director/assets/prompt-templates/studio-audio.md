---
schema: prompt-template-v1
template_id: studio-audio
kind: studio
version: 1.0.0
status: candidate
---
<prompt_template>
<abstract>Compile an evidence-grounded spoken-audio brief for the declared audience and duration.</abstract>
<routing>Use for NotebookLM Studio audio; use podcast-script when exact dialogue is required.</routing>
<inputs>audience; objective; locale; duration; speaker preference</inputs>
<source_selection>Bind control, voice canon, selected evidence and this template; never all sources.</source_selection>
<output_contract>Opening promise, timed sections, transitions, close, pronunciation and source notes.</output_contract>
<negative_prompt>No fake quotations, unsupported claims, internal instructions or essay cadence.</negative_prompt>
<acceptance>Speakable pacing, audible structure, grounded claims and requested locale.</acceptance>
<idempotency>Hash normalized intent, template version, locale, profile and ordered source set.</idempotency>
</prompt_template>
