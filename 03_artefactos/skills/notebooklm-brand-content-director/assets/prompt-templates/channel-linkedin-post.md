---
schema: prompt-template-v1
template_id: channel-linkedin-post
kind: channel
version: 1.0.0
status: candidate
---
<prompt_template>
<abstract>Compile a platform-ready post with one thesis, useful evidence and a natural action.</abstract>
<routing>Use for a single LinkedIn post; use linkedin-carousel for card-based progression.</routing>
<inputs>audience; objective; locale; thesis; call to action</inputs>
<source_selection>Bind control, voice canon, selected evidence and this template.</source_selection>
<output_contract>Hook, concise body, evidence-aware payoff, CTA and optional restrained hashtags.</output_contract>
<negative_prompt>No engagement bait, unsupported certainty, hashtag stuffing or copied reference phrasing.</negative_prompt>
<acceptance>Voice fidelity, single thesis, skimmable flow and natural CTA.</acceptance>
<idempotency>Hash normalized intent, template version, locale, profile and ordered source set.</idempotency>
</prompt_template>
