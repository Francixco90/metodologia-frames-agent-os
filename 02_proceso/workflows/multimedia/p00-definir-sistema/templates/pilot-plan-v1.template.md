---
schema_version: frames-deliverable-v1
instance_id: DELIV-P00-PILOT-PLAN
deliverable_id: pilot-plan-v1
display_name: Plan piloto · Template
workflow_id: P00
deliverable_class: planning
touchpoint: final
identity:
  brand: MetodologIA
  owner: Marca y dirección creativa
audience: Sponsor y equipo de ejecución.
purpose: Acotar el primer uso del sistema con alcance, owner, coste, riesgo y criterio de aprendizaje.
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
  - source_id: generator-workflow-p00
    ref: 02_proceso/workflows/multimedia/p00-definir-sistema/workflow.yml
    sha256: 1c160fd42643c8b683b8cd95e77e927e40c2f32251b8da0552a6876ea4521da8
    authority: verified
    rights: cleared
formats:
  - md
  - html
piece_families:
  - other
companion_for: null
skills:
  - dev-writing-plans
  - content-os-core
fields:
  - field_id: scope
    label: scope
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:scope⟧
    source_refs: []
  - field_id: owner
    label: owner
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:owner⟧
    source_refs: []
  - field_id: milestones
    label: milestones
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:milestones⟧
    source_refs: []
  - field_id: resources
    label: resources
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:resources⟧
    source_refs: []
  - field_id: risks
    label: risks
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:risks⟧
    source_refs: []
  - field_id: success-criteria
    label: success-criteria
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:success-criteria⟧
    source_refs: []
  - field_id: stop-rule
    label: stop-rule
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:stop-rule⟧
    source_refs: []
state: DRAFT
next_gate: G14
content_sha256: da49e1646b47f29266bbb2d5b66029484e1eba11045a021fdd03b9542cbbe621
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Acotar el primer uso del sistema con alcance, owner, coste, riesgo y criterio de aprendizaje. Decisión pendiente en G14; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Sponsor y equipo de ejecución. Consumidores: P04, human. Foco: prioridades, hitos, dependencias, capacidad, medición y stop rules.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: brand-os-v1, calibration-sample-v1. Fechas y capacidad permanecen unknown hasta tener owner y restricción verificable.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- scope: ⟦UNKNOWN:scope⟧
- owner: ⟦UNKNOWN:owner⟧
- milestones: ⟦UNKNOWN:milestones⟧
- resources: ⟦UNKNOWN:resources⟧
- risks: ⟦UNKNOWN:risks⟧
- success-criteria: ⟦UNKNOWN:success-criteria⟧
- stop-rule: ⟦UNKNOWN:stop-rule⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html. Familias: other. Foco: prioridades, hitos, dependencias, capacidad, medición y stop rules.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S03: Fijar tokens creativos y restricciones del piloto. Stop: Detener si el piloto excede alcance o carece de aprobación.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S03: owner dev-writing-plans; apoyos content-os-core; verifier RT-09.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear secuencias imposibles, dependencias omitidas y capacidad inventada. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: scope, owner, milestones, resources, risks, success-criteria, stop-rule. Gate: G14.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P00 → P04, human. DRAFT; gate G14.
