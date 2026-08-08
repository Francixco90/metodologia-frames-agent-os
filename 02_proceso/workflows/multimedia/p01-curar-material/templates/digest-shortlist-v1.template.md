---
schema_version: frames-deliverable-v1
instance_id: DELIV-P01-DIGEST-SHORTLIST
deliverable_id: digest-shortlist-v1
display_name: Digest y shortlist · Template
workflow_id: P01
deliverable_class: source
touchpoint: final
identity:
  brand: MetodologIA
  owner: Edición documental
audience: Estratega, investigador y aprobador.
purpose: Seleccionar materiales utilizables y declarar exclusiones y gaps.
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
piece_families:
  - other
companion_for: null
skills:
  - metodologia-find-skills
  - content-os-registry
fields:
  - field_id: selected-sources
    label: selected-sources
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:selected-sources⟧
    source_refs: []
  - field_id: rationale
    label: rationale
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:rationale⟧
    source_refs: []
  - field_id: excluded-sources
    label: excluded-sources
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:excluded-sources⟧
    source_refs: []
  - field_id: rights-state
    label: rights-state
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:rights-state⟧
    source_refs: []
  - field_id: coverage-gaps
    label: coverage-gaps
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:coverage-gaps⟧
    source_refs: []
state: DRAFT
next_gate: G14
content_sha256: 0d9cc967cba1f86dd2874ca4a02042db80e5ca85891f3af6f37e689737a0198c
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Seleccionar materiales utilizables y declarar exclusiones y gaps. Decisión pendiente en G14; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Estratega, investigador y aprobador. Consumidores: P02, P03, human. Foco: procedencia, hash, derechos, autoridad, relevancia y limitaciones.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: triage-record-v1. Cada fuente material requiere referencia portable y hash verificable.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- selected-sources: ⟦UNKNOWN:selected-sources⟧
- rationale: ⟦UNKNOWN:rationale⟧
- excluded-sources: ⟦UNKNOWN:excluded-sources⟧
- rights-state: ⟦UNKNOWN:rights-state⟧
- coverage-gaps: ⟦UNKNOWN:coverage-gaps⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html. Familias: other. Foco: procedencia, hash, derechos, autoridad, relevancia y limitaciones.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S03: Seleccionar y priorizar el material utilizable. Stop: Detener si ningún elemento supera el preclear de evidencia y derechos.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S03: owner metodologia-find-skills; apoyos content-os-registry; verifier RT-09.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear material sin derechos, autoridad o integridad demostrable. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: selected-sources, rationale, excluded-sources, rights-state, coverage-gaps. Gate: G14.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P01 → P02, P03, human. DRAFT; gate G14.
