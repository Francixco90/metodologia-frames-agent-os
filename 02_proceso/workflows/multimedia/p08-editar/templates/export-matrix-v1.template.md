---
schema_version: frames-deliverable-v1
instance_id: DELIV-P08-EXPORT-MATRIX
deliverable_id: export-matrix-v1
display_name: Matriz de exportación · Template
workflow_id: P08
deliverable_class: edit
touchpoint: intermediate
identity:
  brand: MetodologIA
  owner: Edición y composición
audience: Producer y distribuidor.
purpose: Definir formatos, dimensiones, duración, peso, nombre, canal y checksum de exportación.
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
  - content-os-remotion-render
  - content-os-seam-craft
fields:
  - field_id: variant
    label: variant
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:variant⟧
    source_refs: []
  - field_id: format
    label: format
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:format⟧
    source_refs: []
  - field_id: dimensions
    label: dimensions
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:dimensions⟧
    source_refs: []
  - field_id: duration
    label: duration
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:duration⟧
    source_refs: []
  - field_id: size-limit
    label: size-limit
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:size-limit⟧
    source_refs: []
  - field_id: filename
    label: filename
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:filename⟧
    source_refs: []
  - field_id: channel
    label: channel
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:channel⟧
    source_refs: []
  - field_id: checksum
    label: checksum
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:checksum⟧
    source_refs: []
state: DRAFT
next_gate: G14
content_sha256: 0c5c074c1a304be4e94a34cabd6084fd8df84a208aa0cee54e5e002f6f445b7a
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Definir formatos, dimensiones, duración, peso, nombre, canal y checksum de exportación. Decisión pendiente en G14; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Producer y distribuidor. Consumidores: P09. Foco: cambios priorizados, comparación, regresión, lineage y candidate successor.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: edit-candidate-v1, edl-v1. Cada cambio debe resolver a un hallazgo y conservar el candidate anterior.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- variant: ⟦UNKNOWN:variant⟧
- format: ⟦UNKNOWN:format⟧
- dimensions: ⟦UNKNOWN:dimensions⟧
- duration: ⟦UNKNOWN:duration⟧
- size-limit: ⟦UNKNOWN:size-limit⟧
- filename: ⟦UNKNOWN:filename⟧
- channel: ⟦UNKNOWN:channel⟧
- checksum: ⟦UNKNOWN:checksum⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html, csv. Familias: image, miniclip, graphic, carousel, story. Foco: cambios priorizados, comparación, regresión, lineage y candidate successor.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S03: Comparar, probar regresiones y definir exportación. Stop: Bloquear diferencias no explicadas, QC incompleto o rollback ausente.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S03: owner content-os-remotion-render; apoyos content-os-seam-craft; verifier RT-09.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear edición sin diff, ownership o prueba de no regresión. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: variant, format, dimensions, duration, size-limit, filename, channel, checksum. Gate: G14.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P08 → P09. DRAFT; gate G14.
