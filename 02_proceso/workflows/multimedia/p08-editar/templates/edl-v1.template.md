---
schema_version: frames-deliverable-v1
instance_id: DELIV-P08-EDL
deliverable_id: edl-v1
display_name: Lista de decisiones de edición · Template
workflow_id: P08
deliverable_class: edit
touchpoint: intermediate
identity:
  brand: MetodologIA
  owner: Edición y composición
audience: Editor y verifier.
purpose: Trazar cada cambio a un hallazgo, ubicación, acción, owner y resultado.
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
  - source_id: generator-workflow-p08
    ref: 02_proceso/workflows/multimedia/p08-editar/workflow.yml
    sha256: 2d299639a7682ca210f41c8134771825910ae0316577aa1f65f60026843a055f
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
companion_for: null
skills:
  - content-os-seam-craft
  - remotion-video-production-v2
fields:
  - field_id: finding-ref
    label: finding-ref
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:finding-ref⟧
    source_refs: []
  - field_id: location
    label: location
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:location⟧
    source_refs: []
  - field_id: action
    label: action
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:action⟧
    source_refs: []
  - field_id: owner
    label: owner
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:owner⟧
    source_refs: []
  - field_id: before-hash
    label: before-hash
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:before-hash⟧
    source_refs: []
  - field_id: after-hash
    label: after-hash
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:after-hash⟧
    source_refs: []
  - field_id: result
    label: result
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:result⟧
    source_refs: []
state: DRAFT
next_gate: G14
content_sha256: a2c909df5c720a2f79fe849d1b9def29ba5f6f50d5afe351c1e92f4e571ab53a
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Trazar cada cambio a un hallazgo, ubicación, acción, owner y resultado. Decisión pendiente en G14; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Editor y verifier. Consumidores: P07, P09. Foco: cambios priorizados, comparación, regresión, lineage y candidate successor.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: asset-package-v1, verdict-v1, top5-changes-v1. Cada cambio debe resolver a un hallazgo y conservar el candidate anterior.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- finding-ref: ⟦UNKNOWN:finding-ref⟧
- location: ⟦UNKNOWN:location⟧
- action: ⟦UNKNOWN:action⟧
- owner: ⟦UNKNOWN:owner⟧
- before-hash: ⟦UNKNOWN:before-hash⟧
- after-hash: ⟦UNKNOWN:after-hash⟧
- result: ⟦UNKNOWN:result⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html, csv. Familias: image, miniclip, graphic, carousel, story. Foco: cambios priorizados, comparación, regresión, lineage y candidate successor.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S01: Priorizar cambios y preparar un successor candidate. Stop: Preservar el candidate anterior y su lineage inmutable.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S01: owner content-os-seam-craft; apoyos remotion-video-production-v2; verifier RT-09.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear edición sin diff, ownership o prueba de no regresión. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: finding-ref, location, action, owner, before-hash, after-hash, result. Gate: G14.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P08 → P07, P09. DRAFT; gate G14.
