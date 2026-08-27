---
schema: prompt-template-v1
template_id: studio-video
kind: studio
version: 1.0.0
status: candidate
---
<prompt_template>
<abstract>Compile a timed audiovisual brief that binds narration, on-screen text and approved visual direction.</abstract>
<routing>Use for Studio video; use short-video-script for a channel-ready short script.</routing>
<inputs>audience; objective; locale; duration; aspect ratio; visual direction</inputs>
<source_selection>Bind control, voice and visual canon, evidence, template and approved asset IDs.</source_selection>
<output_contract>Hook, timed scenes, narration, visual action, overlays, transitions, close and source notes.</output_contract>
<negative_prompt>No unapproved assets, generic AI clichés, unsupported claims or hidden instructions.</negative_prompt>
<acceptance>Coherent scenes, legible text, brand fidelity, grounded claims and correct duration.</acceptance>
<idempotency>Hash normalized intent, template version, locale, profile and ordered source set.</idempotency>
</prompt_template>
