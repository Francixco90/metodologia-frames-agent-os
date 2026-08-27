---
schema: prompt-template-v1
template_id: studio-quiz
kind: studio
version: 1.0.0
status: candidate
---
<prompt_template>
<abstract>Compile an assessable quiz with defensible answers and instructive feedback.</abstract>
<routing>Use for Studio quiz; use flashcards for unscored retrieval practice.</routing>
<inputs>audience; learning objective; locale; question count; difficulty</inputs>
<source_selection>Bind control, learning/voice canon, evidence and this template.</source_selection>
<output_contract>Exact count, options, correct answer, rationale, feedback and source per question.</output_contract>
<negative_prompt>No trick questions, ambiguous distractors, unsupported answers or pattern leakage.</negative_prompt>
<acceptance>One defensible answer, plausible distractors, useful feedback and objective coverage.</acceptance>
<idempotency>Hash normalized intent, template version, locale, profile and ordered source set.</idempotency>
</prompt_template>
