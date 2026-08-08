---
schema_version: frames-deliverable-v1
instance_id: DELIV-P08-EDIT-CANDIDATE
deliverable_id: edit-candidate-v1
display_name: Candidate editado · Template
workflow_id: P08
deliverable_class: edit
touchpoint: final
identity:
  brand: MetodologIA
  owner: Edición y composición
audience: Reviewer y cliente.
purpose: Materializar un successor candidate preservando lineage, claims, assets y estado.
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
  - image
  - video
  - audio
piece_families:
  - image
  - miniclip
  - graphic
  - carousel
  - story
companion_for: null
skills:
  - content-os-remotion-render
  - remotion-video-production-v2
fields:
  - field_id: successor-id
    label: successor-id
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:successor-id⟧
    source_refs: []
  - field_id: parent-hash
    label: parent-hash
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:parent-hash⟧
    source_refs: []
  - field_id: changes
    label: changes
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:changes⟧
    source_refs: []
  - field_id: material-files
    label: material-files
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:material-files⟧
    source_refs: []
  - field_id: hashes
    label: hashes
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:hashes⟧
    source_refs: []
  - field_id: state
    label: state
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:state⟧
    source_refs: []
  - field_id: limitations
    label: limitations
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:limitations⟧
    source_refs: []
state: DRAFT
next_gate: G14
content_sha256: 7002b0f645ccfb06e36fdbfe396f1a8154b75d655ced7abc921eb8ec4a7db9e5
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Materializar un successor candidate preservando lineage, claims, assets y estado. Decisión pendiente en G14; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Reviewer y cliente. Consumidores: P07, P09, human. Foco: cambios priorizados, comparación, regresión, lineage y candidate successor.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: asset-package-v1, edl-v1. Cada cambio debe resolver a un hallazgo y conservar el candidate anterior.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- successor-id: ⟦UNKNOWN:successor-id⟧
- parent-hash: ⟦UNKNOWN:parent-hash⟧
- changes: ⟦UNKNOWN:changes⟧
- material-files: ⟦UNKNOWN:material-files⟧
- hashes: ⟦UNKNOWN:hashes⟧
- state: ⟦UNKNOWN:state⟧
- limitations: ⟦UNKNOWN:limitations⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html, image, video, audio. Familias: image, miniclip, graphic, carousel, story. Foco: cambios priorizados, comparación, regresión, lineage y candidate successor.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S02: Editar, componer o localizar según el EDL. Stop: Volver a P06 si falta un activo; no fabricar sustitutos no autorizados.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S02: owner content-os-remotion-render; apoyos remotion-video-production-v2; verifier RT-09.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear edición sin diff, ownership o prueba de no regresión. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: successor-id, parent-hash, changes, material-files, hashes, state, limitations. Gate: G14.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P08 → P07, P09, human. DRAFT; gate G14.
