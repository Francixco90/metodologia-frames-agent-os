---
schema_version: frames-deliverable-v1
instance_id: DELIV-P06-ASSET-MANIFEST
deliverable_id: asset-manifest-v1
display_name: Manifiesto de activos · Template
workflow_id: P06
deliverable_class: asset
touchpoint: intermediate
identity:
  brand: MetodologIA
  owner: Generación y captura
audience: Reviewer, verifier y Guardian.
purpose: Registrar archivo, hash, procedencia, derechos, tool run y relación con la especificación.
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
  - json
piece_families:
  - image
  - miniclip
  - graphic
  - carousel
  - story
companion_for: null
skills:
  - content-os-media
  - content-os-core
  - content-os-remotion-render
fields:
  - field_id: asset-id
    label: asset-id
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:asset-id⟧
    source_refs: []
  - field_id: file-ref
    label: file-ref
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:file-ref⟧
    source_refs: []
  - field_id: hash
    label: hash
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:hash⟧
    source_refs: []
  - field_id: provenance
    label: provenance
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:provenance⟧
    source_refs: []
  - field_id: rights
    label: rights
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:rights⟧
    source_refs: []
  - field_id: tool-run
    label: tool-run
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:tool-run⟧
    source_refs: []
  - field_id: spec-ref
    label: spec-ref
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:spec-ref⟧
    source_refs: []
state: DRAFT
next_gate: G14
content_sha256: c2cd5cff177fa6a098c0f153765cb4c5d09ab0f629c69f8c42aeeced8702a4fe
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Registrar archivo, hash, procedencia, derechos, tool run y relación con la especificación. Decisión pendiente en G14; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Reviewer, verifier y Guardian. Consumidores: P07, P08. Foco: activo material, variante, procedencia, continuidad y paquete companion.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: asset-package-v1, tool-run-evidence-v1, asset-package-v1, asset-manifest-v1. Un activo solo deja DRAFT cuando existe material y su hash fue leído del disco.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- asset-id: ⟦UNKNOWN:asset-id⟧
- file-ref: ⟦UNKNOWN:file-ref⟧
- hash: ⟦UNKNOWN:hash⟧
- provenance: ⟦UNKNOWN:provenance⟧
- rights: ⟦UNKNOWN:rights⟧
- tool-run: ⟦UNKNOWN:tool-run⟧
- spec-ref: ⟦UNKNOWN:spec-ref⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html, json. Familias: image, miniclip, graphic, carousel, story. Foco: activo material, variante, procedencia, continuidad y paquete companion.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S03: Registrar procedencia y comprobar continuidad. Stop: Bloquear outputs sin archivo material, hash o lineage.
- S04: Empaquetar el candidate sin promover su estado. Stop: RENDERED_DRAFT no concede aprobación, readiness ni publicación.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S03: owner content-os-media; apoyos content-os-core; verifier RT-09.
- S04: owner content-os-remotion-render; apoyos content-os-core; verifier RT-09.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear activos inexistentes, hashes sintéticos y companions divergentes. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: asset-id, file-ref, hash, provenance, rights, tool-run, spec-ref. Gate: G14.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P06 → P07, P08. DRAFT; gate G14.
