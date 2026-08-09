---
schema_version: frames-deliverable-v1
instance_id: DELIV-P09-RESULTS-DASHBOARD
deliverable_id: results-dashboard-v1
display_name: Dashboard de resultados · Template
workflow_id: P09
deliverable_class: measurement
touchpoint: final
identity:
  brand: MetodologIA
  owner: Publicación y aprendizaje
audience: Sponsor, cliente y equipo de contenido.
purpose: Comparar baseline, objetivos y métricas observadas sin inventar datos ni causalidad.
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
  - csv
piece_families:
  - dashboard
companion_for: null
skills:
  - instagram-content-orchestration
  - metodologia-brand-router
fields:
  - field_id: measurement-window
    label: measurement-window
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:measurement-window⟧
    source_refs: []
  - field_id: baseline
    label: baseline
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:baseline⟧
    source_refs: []
  - field_id: objective
    label: objective
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:objective⟧
    source_refs: []
  - field_id: metric
    label: metric
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:metric⟧
    source_refs: []
  - field_id: observed-value
    label: observed-value
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:observed-value⟧
    source_refs: []
  - field_id: source-ref
    label: source-ref
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:source-ref⟧
    source_refs: []
  - field_id: variance
    label: variance
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:variance⟧
    source_refs: []
  - field_id: limitation
    label: limitation
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:limitation⟧
    source_refs: []
state: DRAFT
next_gate: G17
content_sha256: dfe0669e34d77d52cd51ade1d43b24098d258f213b49c4121e98289d2481c1f0
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Comparar baseline, objetivos y métricas observadas sin inventar datos ni causalidad. Decisión pendiente en G17; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Sponsor, cliente y equipo de contenido. Consumidores: P00, P02, human. Foco: objetivo, métrica, fuente, ventana, interpretación y siguiente decisión.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: publication-record-v1, observed-results. Toda métrica debe declarar origen, método y límite de interpretación.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- measurement-window: ⟦UNKNOWN:measurement-window⟧
- baseline: ⟦UNKNOWN:baseline⟧
- objective: ⟦UNKNOWN:objective⟧
- metric: ⟦UNKNOWN:metric⟧
- observed-value: ⟦UNKNOWN:observed-value⟧
- source-ref: ⟦UNKNOWN:source-ref⟧
- variance: ⟦UNKNOWN:variance⟧
- limitation: ⟦UNKNOWN:limitation⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html, csv. Familias: dashboard. Foco: objetivo, métrica, fuente, ventana, interpretación y siguiente decisión.

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

Campos: measurement-window, baseline, objective, metric, observed-value, source-ref, variance, limitation. Gate: G17.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P09 → P00, P02, human. DRAFT; gate G17.
