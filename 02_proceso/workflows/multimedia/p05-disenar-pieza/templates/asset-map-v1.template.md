---
schema_version: frames-deliverable-v1
instance_id: DELIV-P05-ASSET-MAP
deliverable_id: asset-map-v1
display_name: Mapa de activos · Template
workflow_id: P05
deliverable_class: creative-spec
touchpoint: intermediate
identity:
  brand: MetodologIA
  owner: Guion y diseño multimedia
audience: Producer y asset manager.
purpose: Enumerar cada activo, fuente, owner, formato, dependencia y criterio de aceptación.
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
  - source_id: generator-workflow-p05
    ref: 02_proceso/workflows/multimedia/p05-disenar-pieza/workflow.yml
    sha256: 1360dde664b7bf1e409d2520a4062df3bd217b949497d192be48ed3666906ea6
    authority: verified
    rights: cleared
formats:
  - md
  - html
  - csv
piece_families:
  - image
  - miniclip
  - graphic
  - carousel
  - story
  - presentation
companion_for: null
skills:
  - design-compose-graphics
  - content-os-remotion-bridge
fields:
  - field_id: asset-id
    label: asset-id
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:asset-id⟧
    source_refs: []
  - field_id: role
    label: role
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:role⟧
    source_refs: []
  - field_id: source
    label: source
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:source⟧
    source_refs: []
  - field_id: owner
    label: owner
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:owner⟧
    source_refs: []
  - field_id: format
    label: format
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:format⟧
    source_refs: []
  - field_id: dependency
    label: dependency
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:dependency⟧
    source_refs: []
  - field_id: acceptance
    label: acceptance
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:acceptance⟧
    source_refs: []
state: DRAFT
next_gate: G14
content_sha256: 70fe8b619bc54bed1fab11627f4025f99fddc8fe6c73d5436b8c4e0b69f0dd72
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Enumerar cada activo, fuente, owner, formato, dependencia y criterio de aceptación. Decisión pendiente en G14; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Producer y asset manager. Consumidores: P06, P07. Foco: medio, narrativa, continuidad, mapa de activos y especificación producible.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: creative-spec-v1, continuity-bible-v1. Toda especificación debe resolver al brief y a restricciones aprobadas.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- asset-id: ⟦UNKNOWN:asset-id⟧
- role: ⟦UNKNOWN:role⟧
- source: ⟦UNKNOWN:source⟧
- owner: ⟦UNKNOWN:owner⟧
- format: ⟦UNKNOWN:format⟧
- dependency: ⟦UNKNOWN:dependency⟧
- acceptance: ⟦UNKNOWN:acceptance⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html, csv. Familias: image, miniclip, graphic, carousel, story, presentation. Foco: medio, narrativa, continuidad, mapa de activos y especificación producible.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S03: Mapear activos, prompts y derivados. Stop: Bloquear cualquier activo sin fuente, owner, formato o criterio de aceptación.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S03: owner design-compose-graphics; apoyos content-os-remotion-bridge; verifier RT-09.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear contradicciones de continuidad, formato o identidad. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: asset-id, role, source, owner, format, dependency, acceptance. Gate: G14.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P05 → P06, P07. DRAFT; gate G14.
