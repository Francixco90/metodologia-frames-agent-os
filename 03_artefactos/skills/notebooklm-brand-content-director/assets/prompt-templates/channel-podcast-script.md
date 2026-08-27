---
schema: prompt-template-v1
template_id: channel-podcast-script
kind: channel
version: 1.0.0
status: candidate
---
<prompt_template>
<abstract>Compile a speakable podcast script with timed sections and attributable claims.</abstract>
<routing>Use when exact spoken copy is required; use Studio audio for generated overview format.</routing>
<inputs>audience; objective; locale; duration; speaker count; format</inputs>
<source_selection>Bind control, voice canon, evidence and this template.</source_selection>
<output_contract>Cold open, speaker-labeled timed segments, transitions, close and source notes.</output_contract>
<negative_prompt>No essay cadence, fake quotation, unsupported anecdote or unpronounceable density.</negative_prompt>
<acceptance>Natural speech, timed sections, distinct speakers and sourceable claims.</acceptance>
<idempotency>Hash normalized intent, template version, locale, profile and ordered source set.</idempotency>
</prompt_template>
