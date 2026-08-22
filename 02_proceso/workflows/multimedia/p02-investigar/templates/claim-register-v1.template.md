---
schema_version: frames-deliverable-v1
instance_id: DELIV-P02-CLAIM-REGISTER
deliverable_id: claim-register-v1
display_name: Registro de claims · Template
workflow_id: P02
deliverable_class: research
touchpoint: intermediate
identity:
  brand: MetodologIA
  owner: Investigación editorial
audience: Investigador, productor y verifier.
purpose: Vincular cada afirmación con evidencia, autoridad, límite, estado y revisor.
sources:
  - source_id: generator-definitions
    ref: 02_proceso/workflows/multimedia/_assets/deliverable-definition-registry.yml
    sha256: 54ae8fd7dedbc29e7159817fec55c538f02a6a7a9cdfc82ede8240fc89349caa
    authority: verified
    rights: cleared
  - source_id: generator-profiles
    ref: 02_proceso/workflows/multimedia/_assets/deliverable-template-profiles.yml
    sha256: 0d4d477752a3b9f820fef87c52e88be7f7b2756845ec4d34e1abab75a9ed9738
    authority: verified
    rights: cleared
  - source_id: generator-template-registry
    ref: 02_proceso/workflows/multimedia/_assets/deliverable-template-registry.yml
    sha256: 1b02aebf7bacfe98b3acf783db4957f68da2096d1ac0aa9d93006f3da0bf6c62
    authority: verified
    rights: cleared
  - source_id: generator-html-shell
    ref: 02_proceso/workflows/multimedia/_assets/brief-document-template.html
    sha256: 158d89afc64f9d3c2573acda17fc3a1afe631e5f3f6eb9378a86efc4f6c76f46
    authority: verified
    rights: cleared
  - source_id: generator-design-profile
    ref: 02_proceso/workflows/multimedia/_assets/metodologia-html-v7.yml
    sha256: e18e0c81140a2a25d076993b2249b987b4bb1871aab88fae422c82ae0109b7b4
    authority: verified
    rights: cleared
  - source_id: generator-workflow-p02
    ref: 02_proceso/workflows/multimedia/p02-investigar/workflow.yml
    sha256: fceff0dfefeb2c47c82aabc68379956c5be17d854f8005c1b3a31b11cffa60bf
    authority: verified
    rights: cleared
formats:
  - md
  - html
  - csv
piece_families:
  - other
companion_for: null
skills:
  - content-os-registry
  - content-os-core
fields:
  - field_id: claim
    label: claim
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:claim⟧
    source_refs: []
  - field_id: source-ref
    label: source-ref
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:source-ref⟧
    source_refs: []
  - field_id: evidence-status
    label: evidence-status
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:evidence-status⟧
    source_refs: []
  - field_id: limitation
    label: limitation
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:limitation⟧
    source_refs: []
  - field_id: reviewer
    label: reviewer
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:reviewer⟧
    source_refs: []
  - field_id: decision
    label: decision
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:decision⟧
    source_refs: []
state: DRAFT
next_gate: G14
content_sha256: 882c8fd0fd434eb5d97e83ef46665ad2fe817a1a1ad931a0f05af7941697bc40
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Vincular cada afirmación con evidencia, autoridad, límite, estado y revisor. Decisión pendiente en G14; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Investigador, productor y verifier. Consumidores: P03, P05, P07. Foco: preguntas, claims, evidencia, límites y oportunidades justificadas.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: question-bank-v1, governed-sources. Separar evidencia observada, inferencia y preguntas todavía abiertas.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- claim: ⟦UNKNOWN:claim⟧
- source-ref: ⟦UNKNOWN:source-ref⟧
- evidence-status: ⟦UNKNOWN:evidence-status⟧
- limitation: ⟦UNKNOWN:limitation⟧
- reviewer: ⟦UNKNOWN:reviewer⟧
- decision: ⟦UNKNOWN:decision⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html, csv. Familias: other. Foco: preguntas, claims, evidencia, límites y oportunidades justificadas.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S02: Buscar evidencia solo en fuentes autorizadas. Stop: Marcar UNKNOWN y bloquear si la evidencia es insuficiente.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S02: owner content-os-registry; apoyos content-os-core; verifier RT-09.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear claims sin fuente y síntesis que exceda la evidencia disponible. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: claim, source-ref, evidence-status, limitation, reviewer, decision. Gate: G14.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P02 → P03, P05, P07. DRAFT; gate G14.
