---
schema: prompt-template-v1
template_id: channel-email
kind: channel
version: 1.0.0
status: candidate
---
<prompt_template>
<abstract>Compile a concise email with an accurate promise and one clear action.</abstract>
<routing>Use for direct email copy; use newsletter-article for long-form editorial delivery.</routing>
<inputs>audience; objective; locale; call to action; sender context</inputs>
<source_selection>Bind control, voice canon, necessary evidence and this template.</source_selection>
<output_contract>Subject options, preview, greeting, scannable body, single CTA and sign-off.</output_contract>
<negative_prompt>No false urgency, multiple CTAs, unsupported personalization or deceptive subject.</negative_prompt>
<acceptance>Accurate subject, scannable body, voice fidelity and one visible action.</acceptance>
<idempotency>Hash normalized intent, template version, locale, profile and ordered source set.</idempotency>
</prompt_template>
