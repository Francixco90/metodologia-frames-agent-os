---
schema_version: frames-deliverable-v1
instance_id: DELIV-P09-PUBLICATION-RECORD
deliverable_id: publication-record-v1
display_name: Registro de publicación · Template
workflow_id: P09
deliverable_class: distribution
touchpoint: intermediate
identity:
  brand: MetodologIA
  owner: Publicación y aprendizaje
audience: Operador, verifier y Guardian.
purpose: Preparar el registro que solo se completa con evidencia externa de publicación autorizada.
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
  - json
piece_families:
  - other
companion_for: null
skills:
  - instagram-carousel-production
  - instagram-content-orchestration
fields:
  - field_id: authorization-ref
    label: authorization-ref
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:authorization-ref⟧
    source_refs: []
  - field_id: channel
    label: channel
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:channel⟧
    source_refs: []
  - field_id: candidate-hash
    label: candidate-hash
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:candidate-hash⟧
    source_refs: []
  - field_id: external-ref
    label: external-ref
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:external-ref⟧
    source_refs: []
  - field_id: published-at
    label: published-at
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:published-at⟧
    source_refs: []
  - field_id: actor
    label: actor
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:actor⟧
    source_refs: []
  - field_id: state
    label: state
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:state⟧
    source_refs: []
state: DRAFT
next_gate: G17
content_sha256: d248092ac5d82a6ac7f5ffa7bb78db7d75dde4f7744fecac3f5abe5c7161b9f7
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Preparar el registro que solo se completa con evidencia externa de publicación autorizada. Decisión pendiente en G17; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Operador, verifier y Guardian. Consumidores: human. Foco: canal, adaptación, paquete, autorización y detención previa a publicación.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: platform-package-v1. La autorización humana debe ser específica, vigente y separada del build.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- authorization-ref: ⟦UNKNOWN:authorization-ref⟧
- channel: ⟦UNKNOWN:channel⟧
- candidate-hash: ⟦UNKNOWN:candidate-hash⟧
- external-ref: ⟦UNKNOWN:external-ref⟧
- published-at: ⟦UNKNOWN:published-at⟧
- actor: ⟦UNKNOWN:actor⟧
- state: ⟦UNKNOWN:state⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html, json. Familias: other. Foco: canal, adaptación, paquete, autorización y detención previa a publicación.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S03: Preparar checklist y registro de publicación. Stop: No publicar, enviar ni activar conectores desde este workflow.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S03: owner instagram-carousel-production; apoyos instagram-content-orchestration; verifier RT-11.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear publicación, envío o conector sin aprobación explícita. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: authorization-ref, channel, candidate-hash, external-ref, published-at, actor, state. Gate: G17.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P09 → human. DRAFT; gate G17.
