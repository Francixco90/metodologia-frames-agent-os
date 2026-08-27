---
schema: prompt-template-v1
template_id: studio-slide-deck
kind: studio
version: 1.0.0
status: candidate
---
<prompt_template>
<abstract>Compile a slide-by-slide narrative with explicit evidence and brand constraints.</abstract>
<routing>Use for Studio slide deck; select an executive, commercial or learning template when purpose is specific.</routing>
<inputs>audience; objective; locale; slide count; aspect ratio</inputs>
<source_selection>Bind control, canon, evidence, template, approved assets and at most two golden references.</source_selection>
<output_contract>Exact slide list with title, purpose, visible copy, visual, evidence and speaker-note sources.</output_contract>
<negative_prompt>No generic logo, internal instructions, wrong count, unsupported claims or dense slides.</negative_prompt>
<acceptance>Exact count, narrative progression, source map, legibility and approved visual system.</acceptance>
<idempotency>Hash normalized intent, template version, locale, profile and ordered source set.</idempotency>
</prompt_template>
