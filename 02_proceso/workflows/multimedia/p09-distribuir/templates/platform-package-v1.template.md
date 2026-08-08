---
schema_version: frames-deliverable-v1
instance_id: DELIV-P09-PLATFORM-PACKAGE
deliverable_id: platform-package-v1
display_name: Paquete por plataforma · Template
workflow_id: P09
deliverable_class: distribution
touchpoint: final
identity:
  brand: MetodologIA
  owner: Publicación y aprendizaje
audience: Operador autorizado y aprobador.
purpose: Preparar archivos, copy, metadata, alt text y checklist por canal sin publicar.
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
  - image
  - miniclip
  - graphic
  - carousel
  - story
companion_for: null
skills:
  - metodologia-brand-router
  - instagram-content-orchestration
  - instagram-carousel-production
fields:
  - field_id: channel
    label: channel
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:channel⟧
    source_refs: []
  - field_id: files
    label: files
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:files⟧
    source_refs: []
  - field_id: copy
    label: copy
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:copy⟧
    source_refs: []
  - field_id: metadata
    label: metadata
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:metadata⟧
    source_refs: []
  - field_id: alt-text
    label: alt-text
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:alt-text⟧
    source_refs: []
  - field_id: authorization
    label: authorization
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:authorization⟧
    source_refs: []
  - field_id: checklist
    label: checklist
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:checklist⟧
    source_refs: []
state: DRAFT
next_gate: G17
content_sha256: 1919591c0fdebf1e18d73c8e7b26c7550abb6b956704b8b6bf72e1cc95f5beda
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Preparar archivos, copy, metadata, alt text y checklist por canal sin publicar. Decisión pendiente en G17; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Operador autorizado y aprobador. Consumidores: human. Foco: canal, adaptación, paquete, autorización y detención previa a publicación.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: edit-candidate-v1, export-matrix-v1, platform-package-v1. La autorización humana debe ser específica, vigente y separada del build.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- channel: ⟦UNKNOWN:channel⟧
- files: ⟦UNKNOWN:files⟧
- copy: ⟦UNKNOWN:copy⟧
- metadata: ⟦UNKNOWN:metadata⟧
- alt-text: ⟦UNKNOWN:alt-text⟧
- authorization: ⟦UNKNOWN:authorization⟧
- checklist: ⟦UNKNOWN:checklist⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html, json. Familias: image, miniclip, graphic, carousel, story. Foco: canal, adaptación, paquete, autorización y detención previa a publicación.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S01: Validar autorización, estado y hash del candidate. Stop: Sin aprobación humana inequívoca, preparar package y detener.
- S02: Adaptar el paquete al canal sin mutar el contenido aprobado. Stop: Bloquear adaptación que altere claims, marca o autorización.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S01: owner metodologia-brand-router; apoyos instagram-content-orchestration; verifier RT-11.
- S02: owner instagram-content-orchestration; apoyos instagram-carousel-production; verifier RT-11.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear publicación, envío o conector sin aprobación explícita. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: channel, files, copy, metadata, alt-text, authorization, checklist. Gate: G17.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P09 → human. DRAFT; gate G17.
