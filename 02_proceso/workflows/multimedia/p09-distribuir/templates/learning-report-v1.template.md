---
schema_version: frames-deliverable-v1
instance_id: DELIV-P09-LEARNING-REPORT
deliverable_id: learning-report-v1
display_name: Reporte de aprendizaje · Template
workflow_id: P09
deliverable_class: measurement
touchpoint: final
identity:
  brand: MetodologIA
  owner: Publicación y aprendizaje
audience: Sponsor, estrategia y equipo creativo.
purpose: Convertir resultados observados en decisiones, límites, hipótesis y siguiente experimento.
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
  - source_id: generator-workflow-p09
    ref: 02_proceso/workflows/multimedia/p09-distribuir/workflow.yml
    sha256: 64eedea4ae070b7c930072e6572e033630906f2740bdb2af6e7df8fd356a450c
    authority: verified
    rights: cleared
formats:
  - md
  - html
piece_families:
  - other
companion_for: null
skills:
  - instagram-content-orchestration
  - metodologia-brand-router
fields:
  - field_id: observations
    label: observations
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:observations⟧
    source_refs: []
  - field_id: evidence
    label: evidence
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:evidence⟧
    source_refs: []
  - field_id: interpretation
    label: interpretation
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:interpretation⟧
    source_refs: []
  - field_id: limitations
    label: limitations
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:limitations⟧
    source_refs: []
  - field_id: decision
    label: decision
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:decision⟧
    source_refs: []
  - field_id: next-experiment
    label: next-experiment
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:next-experiment⟧
    source_refs: []
state: DRAFT
next_gate: G17
content_sha256: 5b80cbf78733ae9f28ecfe3c0e1eca8c9f01b8de2cd3768d0d89c8ad23cf0ff0
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Convertir resultados observados en decisiones, límites, hipótesis y siguiente experimento. Decisión pendiente en G17; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Sponsor, estrategia y equipo creativo. Consumidores: P00, P02, P03, human. Foco: objetivo, métrica, fuente, ventana, interpretación y siguiente decisión.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: publication-record-v1, observed-results. Toda métrica debe declarar origen, método y límite de interpretación.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- observations: ⟦UNKNOWN:observations⟧
- evidence: ⟦UNKNOWN:evidence⟧
- interpretation: ⟦UNKNOWN:interpretation⟧
- limitations: ⟦UNKNOWN:limitations⟧
- decision: ⟦UNKNOWN:decision⟧
- next-experiment: ⟦UNKNOWN:next-experiment⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html. Familias: other. Foco: objetivo, métrica, fuente, ventana, interpretación y siguiente decisión.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S04: Registrar baseline y aprendizaje sin inventar métricas. Stop: Marcar coverage_gap si no existen datos observables.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S04: owner instagram-content-orchestration; apoyos metodologia-brand-router; verifier RT-11.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear métricas sin fuente, causalidad no demostrada y optimización prematura. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: observations, evidence, interpretation, limitations, decision, next-experiment. Gate: G17.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P09 → P00, P02, P03, human. DRAFT; gate G17.
