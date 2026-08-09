---
schema_version: frames-deliverable-v1
instance_id: DELIV-P04-BATCH-PLAN
deliverable_id: batch-plan-v1
display_name: Plan por lotes · Template
workflow_id: P04
deliverable_class: planning
touchpoint: intermediate
identity:
  brand: MetodologIA
  owner: Operaciones de contenido
audience: Producer y operaciones.
purpose: Agrupar producción compatible sin romper dependencias, calidad ni capacidad.
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
  - source_id: generator-workflow-p04
    ref: 02_proceso/workflows/multimedia/p04-calendarizar/workflow.yml
    sha256: 89318760b114f8c344b7bffd46a38e16861e25a5554f8d180d760a82f4eb4f19
    authority: verified
    rights: cleared
formats:
  - md
  - html
piece_families:
  - image
  - miniclip
  - graphic
  - carousel
  - story
companion_for: null
skills:
  - content-os-core
  - dev-executing-plans
fields:
  - field_id: batch
    label: batch
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:batch⟧
    source_refs: []
  - field_id: items
    label: items
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:items⟧
    source_refs: []
  - field_id: shared-inputs
    label: shared-inputs
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:shared-inputs⟧
    source_refs: []
  - field_id: capacity
    label: capacity
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:capacity⟧
    source_refs: []
  - field_id: sequence
    label: sequence
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:sequence⟧
    source_refs: []
  - field_id: quality-gate
    label: quality-gate
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:quality-gate⟧
    source_refs: []
  - field_id: learning
    label: learning
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:learning⟧
    source_refs: []
state: DRAFT
next_gate: G14
content_sha256: 9d4fe0a90d32b740a45c2241711df8bcc87e20b3f91744ca14c39c571cf12fa4
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Agrupar producción compatible sin romper dependencias, calidad ni capacidad. Decisión pendiente en G14; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Producer y operaciones. Consumidores: P05, P06. Foco: prioridades, hitos, dependencias, capacidad, medición y stop rules.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: editorial-calendar-v1, board-v1. Fechas y capacidad permanecen unknown hasta tener owner y restricción verificable.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- batch: ⟦UNKNOWN:batch⟧
- items: ⟦UNKNOWN:items⟧
- shared-inputs: ⟦UNKNOWN:shared-inputs⟧
- capacity: ⟦UNKNOWN:capacity⟧
- sequence: ⟦UNKNOWN:sequence⟧
- quality-gate: ⟦UNKNOWN:quality-gate⟧
- learning: ⟦UNKNOWN:learning⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html. Familias: image, miniclip, graphic, carousel, story. Foco: prioridades, hitos, dependencias, capacidad, medición y stop rules.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S03: Definir lotes y medición antes de extender. Stop: Bloquear un lote que exceda capacidad o no tenga criterio de aprendizaje.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S03: owner content-os-core; apoyos dev-executing-plans; verifier RT-11.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear secuencias imposibles, dependencias omitidas y capacidad inventada. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: batch, items, shared-inputs, capacity, sequence, quality-gate, learning. Gate: G14.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P04 → P05, P06. DRAFT; gate G14.
