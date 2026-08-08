---
schema_version: frames-deliverable-v1
instance_id: DELIV-P04-BOARD
deliverable_id: board-v1
display_name: Tablero de producción · Template
workflow_id: P04
deliverable_class: planning
touchpoint: intermediate
identity:
  brand: MetodologIA
  owner: Operaciones de contenido
audience: Equipo de ejecución.
purpose: Exponer trabajo, estado, capacidad, bloqueos y siguiente gate por ítem.
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
  - csv
piece_families:
  - other
companion_for: null
skills:
  - dev-executing-plans
  - content-os-core
fields:
  - field_id: work-item
    label: work-item
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:work-item⟧
    source_refs: []
  - field_id: owner
    label: owner
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:owner⟧
    source_refs: []
  - field_id: state
    label: state
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:state⟧
    source_refs: []
  - field_id: capacity
    label: capacity
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:capacity⟧
    source_refs: []
  - field_id: blocker
    label: blocker
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:blocker⟧
    source_refs: []
  - field_id: next-gate
    label: next-gate
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:next-gate⟧
    source_refs: []
state: DRAFT
next_gate: G14
content_sha256: bfce2587e6ad2b3b9f779535594fb3b74d5917a45cd6851124e533792232ce60
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Exponer trabajo, estado, capacidad, bloqueos y siguiente gate por ítem. Decisión pendiente en G14; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Equipo de ejecución. Consumidores: P05, P06, P08. Foco: prioridades, hitos, dependencias, capacidad, medición y stop rules.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: editorial-calendar-v1. Fechas y capacidad permanecen unknown hasta tener owner y restricción verificable.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- work-item: ⟦UNKNOWN:work-item⟧
- owner: ⟦UNKNOWN:owner⟧
- state: ⟦UNKNOWN:state⟧
- capacity: ⟦UNKNOWN:capacity⟧
- blocker: ⟦UNKNOWN:blocker⟧
- next-gate: ⟦UNKNOWN:next-gate⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html, csv. Familias: other. Foco: prioridades, hitos, dependencias, capacidad, medición y stop rules.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S02: Asignar hitos, dependencias y capacidad. Stop: Reducir al primer sprint si la capacidad no es verificable.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S02: owner dev-executing-plans; apoyos content-os-core; verifier RT-11.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear secuencias imposibles, dependencias omitidas y capacidad inventada. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: work-item, owner, state, capacity, blocker, next-gate. Gate: G14.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P04 → P05, P06, P08. DRAFT; gate G14.
