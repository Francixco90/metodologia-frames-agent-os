---
schema: prompt-template-v1
template_id: channel-branded-static-visual
kind: channel
version: 1.0.0
status: candidate
---
<prompt_template>
<abstract>Compile a single-message visual brief using only approved brand tokens and assets.</abstract>
<routing>Use for a branded static visual; use infographic when explanatory evidence is primary.</routing>
<inputs>audience; message; locale; canvas; placement</inputs>
<source_selection>Bind control, voice/visual canon, necessary evidence, template and approved assets.</source_selection>
<output_contract>Focal message, composition, hierarchy, copy, asset placement, safe zones and alt text.</output_contract>
<negative_prompt>No recreated logo, dense copy, off-brand tokens, noisy background or unapproved image.</negative_prompt>
<acceptance>One focal message, approved assets, legible hierarchy, correct canvas and alt text.</acceptance>
<idempotency>Hash normalized intent, template version, locale, profile and ordered source set.</idempotency>
</prompt_template>
