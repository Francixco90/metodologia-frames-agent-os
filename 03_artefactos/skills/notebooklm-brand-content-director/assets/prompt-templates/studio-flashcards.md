---
schema: prompt-template-v1
template_id: studio-flashcards
kind: studio
version: 1.0.0
status: candidate
---
<prompt_template>
<abstract>Compile atomic retrieval-practice cards from selected instructional evidence.</abstract>
<routing>Use for Studio flashcards; use quiz when scoring and distractors are required.</routing>
<inputs>audience; learning objective; locale; card count; difficulty</inputs>
<source_selection>Bind control, learning/voice canon, evidence and this template.</source_selection>
<output_contract>Exact card count; one unambiguous prompt, concise answer and source per card.</output_contract>
<negative_prompt>No multiple facts per card, vague prompts, trick wording or unsupported answers.</negative_prompt>
<acceptance>Atomic recall, accurate answers, useful coverage and declared count.</acceptance>
<idempotency>Hash normalized intent, template version, locale, profile and ordered source set.</idempotency>
</prompt_template>
