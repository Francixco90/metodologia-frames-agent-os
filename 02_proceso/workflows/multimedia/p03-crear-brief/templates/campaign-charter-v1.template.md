---
schema_version: frames-deliverable-v1
instance_id: DELIV-P03-CAMPAIGN-CHARTER
deliverable_id: campaign-charter-v1
display_name: Charter de campaña · Template
workflow_id: P03
deliverable_class: strategy
touchpoint: final
identity:
  brand: MetodologIA
  owner: Arquitectura editorial
audience: Sponsor, cliente y responsables de ejecución.
purpose: Fijar alcance, resultado, governance, piezas, hitos, medición y autoridad de campaña.
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
  - pdf
piece_families:
  - image
  - miniclip
  - graphic
  - carousel
  - story
  - presentation
  - dashboard
companion_for: null
skills:
  - content-os-creative
  - dev-writing-plans
fields:
  - field_id: mission
    label: mission
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:mission⟧
    source_refs: []
  - field_id: scope
    label: scope
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:scope⟧
    source_refs: []
  - field_id: audience
    label: audience
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:audience⟧
    source_refs: []
  - field_id: outcomes
    label: outcomes
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:outcomes⟧
    source_refs: []
  - field_id: piece-system
    label: piece-system
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:piece-system⟧
    source_refs: []
  - field_id: governance
    label: governance
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:governance⟧
    source_refs: []
  - field_id: milestones
    label: milestones
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:milestones⟧
    source_refs: []
  - field_id: measurement
    label: measurement
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:measurement⟧
    source_refs: []
  - field_id: stop-rule
    label: stop-rule
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:stop-rule⟧
    source_refs: []
state: DRAFT
next_gate: MW_BRIEF_APPROVED
content_sha256: 3a915cf935b1a88c07b4e6eb3546df32849154168b0aab2add860e258523d105
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Fijar alcance, resultado, governance, piezas, hitos, medición y autoridad de campaña. Decisión pendiente en MW_BRIEF_APPROVED; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Sponsor, cliente y responsables de ejecución. Consumidores: P04, P05, P09, human. Foco: objetivo, audiencia, arquitectura de pieza, alternativas y decisión.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: intent-envelope, claim-register-v1, opportunity-map-v1. Cada decisión estratégica debe citar el input que la habilita.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- mission: ⟦UNKNOWN:mission⟧
- scope: ⟦UNKNOWN:scope⟧
- audience: ⟦UNKNOWN:audience⟧
- outcomes: ⟦UNKNOWN:outcomes⟧
- piece-system: ⟦UNKNOWN:piece-system⟧
- governance: ⟦UNKNOWN:governance⟧
- milestones: ⟦UNKNOWN:milestones⟧
- measurement: ⟦UNKNOWN:measurement⟧
- stop-rule: ⟦UNKNOWN:stop-rule⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html, pdf. Familias: image, miniclip, graphic, carousel, story, presentation, dashboard. Foco: objetivo, audiencia, arquitectura de pieza, alternativas y decisión.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S01: Interpretar intención, audiencia, objetivo y evidencia. Stop: Formular como máximo tres preguntas; volver a P02 si falta evidencia.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S01: owner content-os-creative; apoyos dev-writing-plans; verifier RT-09.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear estrategia sin objetivo, audiencia o suficiencia de evidencia. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: mission, scope, audience, outcomes, piece-system, governance, milestones, measurement, stop-rule. Gate: MW_BRIEF_APPROVED.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P03 → P04, P05, P09, human. DRAFT; gate MW_BRIEF_APPROVED.
