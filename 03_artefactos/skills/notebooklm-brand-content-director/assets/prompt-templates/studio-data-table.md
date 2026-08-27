---
schema: prompt-template-v1
template_id: studio-data-table
kind: studio
version: 1.0.0
status: candidate
---
<prompt_template>
<abstract>Normalize selected evidence into a decision-ready table with explicit missing values.</abstract>
<routing>Use for Studio data table when comparison or structured extraction is the main outcome.</routing>
<inputs>audience; decision; locale; row entity; columns; units</inputs>
<source_selection>Bind control, evidence, this template and canon only for terminology.</source_selection>
<output_contract>Stable columns, typed values, units, source refs, status and notes for missing data.</output_contract>
<negative_prompt>No invented cells, mixed units, hidden imputation or decorative prose.</negative_prompt>
<acceptance>Stable schema, sourceable cells, comparable units and declared gaps.</acceptance>
<idempotency>Hash normalized intent, template version, locale, profile and ordered source set.</idempotency>
</prompt_template>
