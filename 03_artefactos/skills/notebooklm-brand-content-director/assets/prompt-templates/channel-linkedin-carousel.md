---
schema: prompt-template-v1
template_id: channel-linkedin-carousel
kind: channel
version: 1.0.0
status: candidate
---
<prompt_template>
<abstract>Compile a swipe-led LinkedIn narrative with one useful idea per card.</abstract>
<routing>Use for a LinkedIn carousel; use one-pager for a printable single-page outcome.</routing>
<inputs>audience; objective; locale; card count; call to action</inputs>
<source_selection>Bind control, voice/visual canon, evidence, template and approved assets.</source_selection>
<output_contract>Exact cards with hook, progressive ideas, visual cue, close, CTA and source map.</output_contract>
<negative_prompt>No dense cards, repeated hooks, unapproved assets or unsupported claims.</negative_prompt>
<acceptance>One idea per card, swipe progression, legible copy and exact count.</acceptance>
<idempotency>Hash normalized intent, template version, locale, profile and ordered source set.</idempotency>
</prompt_template>
