---
schema_version: frames-deliverable-v1
instance_id: DELIV-P06-ASSET-PACKAGE
deliverable_id: asset-package-v1
display_name: Paquete de piezas candidatas · Template
workflow_id: P06
deliverable_class: asset
touchpoint: final
identity:
  brand: MetodologIA
  owner: Generación y captura
audience: Reviewer y cliente.
purpose: Empaquetar piezas materiales y companions hash-bound sin afirmar aprobación.
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
  - source_id: generator-workflow-p06
    ref: 02_proceso/workflows/multimedia/p06-crear-activos/workflow.yml
    sha256: b99fd92f4ea2fc78fb2595e96a0d3479ea0ad888490441f3d512c8414b6a56af
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
  - content-os-remotion-create
  - content-os-media
  - content-os-remotion-render
  - content-os-core
fields:
  - field_id: candidate-id
    label: candidate-id
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:candidate-id⟧
    source_refs: []
  - field_id: material-files
    label: material-files
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:material-files⟧
    source_refs: []
  - field_id: companion-files
    label: companion-files
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:companion-files⟧
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
content_sha256: e3eaaad5fe3632ea4c09613178326c8993bb88957ac58c995134f06a719ee26c
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Empaquetar piezas materiales y companions hash-bound sin afirmar aprobación. Decisión pendiente en G14; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Reviewer y cliente. Consumidores: P07, human. Foco: activo material, variante, procedencia, continuidad y paquete companion.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: creative-spec-v1, continuity-bible-v1, capability-report-v1, asset-package-v1, asset-manifest-v1. Un activo solo deja DRAFT cuando existe material y su hash fue leído del disco.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- candidate-id: ⟦UNKNOWN:candidate-id⟧
- material-files: ⟦UNKNOWN:material-files⟧
- companion-files: ⟦UNKNOWN:companion-files⟧
- hashes: ⟦UNKNOWN:hashes⟧
- state: ⟦UNKNOWN:state⟧
- limitations: ⟦UNKNOWN:limitations⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html, image, video, audio. Familias: image, miniclip, graphic, carousel, story. Foco: activo material, variante, procedencia, continuidad y paquete companion.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S02: Producir o capturar activos por etapas. Stop: Limitar a prototipo no publicable si persiste riesgo o falta capacidad.
- S04: Empaquetar el candidate sin promover su estado. Stop: RENDERED_DRAFT no concede aprobación, readiness ni publicación.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S02: owner content-os-remotion-create; apoyos content-os-media; verifier RT-09.
- S04: owner content-os-remotion-render; apoyos content-os-core; verifier RT-09.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear activos inexistentes, hashes sintéticos y companions divergentes. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: candidate-id, material-files, companion-files, hashes, state, limitations. Gate: G14.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P06 → P07, human. DRAFT; gate G14.
