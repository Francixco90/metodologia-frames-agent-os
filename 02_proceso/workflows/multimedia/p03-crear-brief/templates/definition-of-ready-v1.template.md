---
schema_version: frames-deliverable-v1
instance_id: DELIV-P03-DEFINITION-OF-READY
deliverable_id: definition-of-ready-v1
display_name: Definition of Ready · Template
workflow_id: P03
deliverable_class: strategy
touchpoint: final
identity:
  brand: MetodologIA
  owner: Arquitectura editorial
audience: Producer, verifier y aprobador.
purpose: Bloquear producción hasta resolver evidencia, ownership, formato, assets, presupuesto y aprobación.
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
  - source_id: generator-workflow-p03
    ref: 02_proceso/workflows/multimedia/p03-crear-brief/workflow.yml
    sha256: ba2face5692381cdc2b946fd5b1780d4fc379b4c66aa37d2b9a5d783330b837f
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
  - field_id: evidence-ready
    label: evidence-ready
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:evidence-ready⟧
    source_refs: []
  - field_id: owner-ready
    label: owner-ready
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:owner-ready⟧
    source_refs: []
  - field_id: format-ready
    label: format-ready
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:format-ready⟧
    source_refs: []
  - field_id: assets-ready
    label: assets-ready
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:assets-ready⟧
    source_refs: []
  - field_id: budget-ready
    label: budget-ready
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:budget-ready⟧
    source_refs: []
  - field_id: approval-ready
    label: approval-ready
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:approval-ready⟧
    source_refs: []
state: DRAFT
next_gate: MW_BRIEF_APPROVED
content_sha256: 8a519ce0f999959157738cce5848cf70a71f641e4e45cf7e7fea98b7597baf0e
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Bloquear producción hasta resolver evidencia, ownership, formato, assets, presupuesto y aprobación. Decisión pendiente en MW_BRIEF_APPROVED; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Producer, verifier y aprobador. Consumidores: P04, P05, human. Foco: objetivo, audiencia, arquitectura de pieza, alternativas y decisión.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: brief-campaign-map-v1, ab-concepts-v1. Cada decisión estratégica debe citar el input que la habilita.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- evidence-ready: ⟦UNKNOWN:evidence-ready⟧
- owner-ready: ⟦UNKNOWN:owner-ready⟧
- format-ready: ⟦UNKNOWN:format-ready⟧
- assets-ready: ⟦UNKNOWN:assets-ready⟧
- budget-ready: ⟦UNKNOWN:budget-ready⟧
- approval-ready: ⟦UNKNOWN:approval-ready⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html. Familias: other. Foco: objetivo, audiencia, arquitectura de pieza, alternativas y decisión.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S04: Comprobar Definition of Ready y solicitar decisión. Stop: Detener antes de producir hasta recibir aprobación inequívoca del brief.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S04: owner dev-writing-plans; apoyos content-os-core; verifier RT-09.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear estrategia sin objetivo, audiencia o suficiencia de evidencia. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: evidence-ready, owner-ready, format-ready, assets-ready, budget-ready, approval-ready. Gate: MW_BRIEF_APPROVED.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P03 → P04, P05, human. DRAFT; gate MW_BRIEF_APPROVED.
