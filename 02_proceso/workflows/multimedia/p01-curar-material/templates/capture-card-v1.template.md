---
schema_version: frames-deliverable-v1
instance_id: DELIV-P01-CAPTURE-CARD
deliverable_id: capture-card-v1
display_name: Ficha de captura · Template
workflow_id: P01
deliverable_class: source
touchpoint: intermediate
identity:
  brand: MetodologIA
  owner: Edición documental
audience: Curador, investigador y verifier.
purpose: Registrar una fuente con hash, autoridad, derechos, relevancia y limitaciones.
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
  - json
piece_families:
  - other
companion_for: null
skills:
  - content-os-registry
  - content-os-media
fields:
  - field_id: source-ref
    label: source-ref
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:source-ref⟧
    source_refs: []
  - field_id: source-hash
    label: source-hash
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:source-hash⟧
    source_refs: []
  - field_id: authority
    label: authority
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:authority⟧
    source_refs: []
  - field_id: rights
    label: rights
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:rights⟧
    source_refs: []
  - field_id: relevance
    label: relevance
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:relevance⟧
    source_refs: []
  - field_id: limitations
    label: limitations
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:limitations⟧
    source_refs: []
state: DRAFT
next_gate: G14
content_sha256: 311fd40f7096455708a05995d625c5c8cdf1a74c467bed345fb9a1b8b3deb021
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Registrar una fuente con hash, autoridad, derechos, relevancia y limitaciones. Decisión pendiente en G14; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Curador, investigador y verifier. Consumidores: P01, P02. Foco: procedencia, hash, derechos, autoridad, relevancia y limitaciones.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: brand-os-v1, source-items. Cada fuente material requiere referencia portable y hash verificable.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- source-ref: ⟦UNKNOWN:source-ref⟧
- source-hash: ⟦UNKNOWN:source-hash⟧
- authority: ⟦UNKNOWN:authority⟧
- rights: ⟦UNKNOWN:rights⟧
- relevance: ⟦UNKNOWN:relevance⟧
- limitations: ⟦UNKNOWN:limitations⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html, json. Familias: other. Foco: procedencia, hash, derechos, autoridad, relevancia y limitaciones.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S01: Inventariar y preservar material con procedencia. Stop: Bloquear si faltan fuente, hash o autoridad.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S01: owner content-os-registry; apoyos content-os-media; verifier RT-09.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear material sin derechos, autoridad o integridad demostrable. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: source-ref, source-hash, authority, rights, relevance, limitations. Gate: G14.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P01 → P01, P02. DRAFT; gate G14.
