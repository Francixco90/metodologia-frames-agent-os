---
schema_version: frames-deliverable-v1
instance_id: DELIV-P01-TRIAGE-RECORD
deliverable_id: triage-record-v1
display_name: Registro de triage · Template
workflow_id: P01
deliverable_class: source
touchpoint: intermediate
identity:
  brand: MetodologIA
  owner: Edición documental
audience: Curador y owner de fuentes.
purpose: Clasificar material por utilidad, riesgo, duplicidad, vigencia y siguiente acción.
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
  - source_id: generator-workflow-p01
    ref: 02_proceso/workflows/multimedia/p01-curar-material/workflow.yml
    sha256: 986b1d625cadbbb2c907efe7882c6e3356f32c5f6311e3d82d4b6e9f5324d9a8
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
  - content-os-media
  - content-os-registry
fields:
  - field_id: item
    label: item
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:item⟧
    source_refs: []
  - field_id: classification
    label: classification
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:classification⟧
    source_refs: []
  - field_id: relevance
    label: relevance
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:relevance⟧
    source_refs: []
  - field_id: risk
    label: risk
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:risk⟧
    source_refs: []
  - field_id: freshness
    label: freshness
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:freshness⟧
    source_refs: []
  - field_id: decision
    label: decision
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:decision⟧
    source_refs: []
state: DRAFT
next_gate: G14
content_sha256: 9b43c0340578abec9eec6383a0940097cc341f32a6a7aa5e2adacbbf2c284317
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Clasificar material por utilidad, riesgo, duplicidad, vigencia y siguiente acción. Decisión pendiente en G14; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Curador y owner de fuentes. Consumidores: P01, P02. Foco: procedencia, hash, derechos, autoridad, relevancia y limitaciones.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: capture-card-v1. Cada fuente material requiere referencia portable y hash verificable.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- item: ⟦UNKNOWN:item⟧
- classification: ⟦UNKNOWN:classification⟧
- relevance: ⟦UNKNOWN:relevance⟧
- risk: ⟦UNKNOWN:risk⟧
- freshness: ⟦UNKNOWN:freshness⟧
- decision: ⟦UNKNOWN:decision⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html, csv. Familias: other. Foco: procedencia, hash, derechos, autoridad, relevancia y limitaciones.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S02: Clasificar relevancia, sensibilidad, derechos y destino. Stop: Bloquear material sensible o sin derechos verificables.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S02: owner content-os-media; apoyos content-os-registry; verifier RT-09.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear material sin derechos, autoridad o integridad demostrable. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: item, classification, relevance, risk, freshness, decision. Gate: G14.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P01 → P01, P02. DRAFT; gate G14.
