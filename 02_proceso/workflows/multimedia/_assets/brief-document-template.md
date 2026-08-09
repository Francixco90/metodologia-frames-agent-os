---
schema_version: frames-brief-v1
brief_id: '{{BRIEF_ID}}'
identity:
  brand: MetodologIA
  owner: '{{OWNER}}'
intent:
  request: '{{REQUEST}}'
  request_hash: '{{REQUEST_SHA256}}'
  content_class: '{{CONTENT_CLASS}}'
sources: []
audience: '{{AUDIENCE}}'
objective: '{{OBJECTIVE}}'
format:
  medium: '{{MEDIUM}}'
  channel: '{{CHANNEL}}'
  specification: '{{FORMAT_SPECIFICATION}}'
workflow_selected: [P03, P05, P07, P08]
skills: ['{{PRIMARY_SKILL}}']
restrictions: []
state: BRIEF_DRAFT
next_gate: '{{NEXT_GATE}}'
content_sha256: '{{CONTENT_SHA256}}'
---

## Resultado esperado

{{EXPECTED_OUTCOME}}

## Pedido interpretado

{{INTERPRETED_REQUEST}}

## Audiencia, problema y acción

{{AUDIENCE_PROBLEM_ACTION}}

## Evidencia, fuentes y supuestos

{{EVIDENCE_SOURCES_ASSUMPTIONS}}

## Propuesta creativa

{{CREATIVE_PROPOSAL}}

## Steps y milestones

{{STEPS_AND_MILESTONES}}

## Deliverables

{{DELIVERABLES}}

## Skills y responsabilidades

{{SKILLS_AND_RESPONSIBILITIES}}

## Riesgos, límites y casos borde

{{RISKS_LIMITS_EDGE_CASES}}

## Criterios de aceptación

{{ACCEPTANCE_CRITERIA}}

## Diagrama

```mermaid
flowchart LR
  A[Pedido] --> B[Brief]
  B --> C[Candidate]
  C --> D[Review gate]
```

## Decisión y siguiente gate

{{DECISION_AND_NEXT_GATE}}
