---
schema_version: frames-deliverable-v1
instance_id: DELIV-P06-TOOL-RUN-EVIDENCE
deliverable_id: tool-run-evidence-v1
display_name: Evidencia de ejecución · Template
workflow_id: P06
deliverable_class: asset
touchpoint: intermediate
identity:
  brand: MetodologIA
  owner: Generación y captura
audience: Verifier y Guardian.
purpose: Vincular inputs, herramienta, versión, parámetros, outputs, hashes y errores del run.
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
  - other
companion_for: null
skills:
  - content-os-remotion-create
  - content-os-media
fields:
  - field_id: run-id
    label: run-id
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:run-id⟧
    source_refs: []
  - field_id: tool
    label: tool
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:tool⟧
    source_refs: []
  - field_id: version
    label: version
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:version⟧
    source_refs: []
  - field_id: input-hashes
    label: input-hashes
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:input-hashes⟧
    source_refs: []
  - field_id: parameters
    label: parameters
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:parameters⟧
    source_refs: []
  - field_id: output-hashes
    label: output-hashes
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:output-hashes⟧
    source_refs: []
  - field_id: errors
    label: errors
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:errors⟧
    source_refs: []
state: DRAFT
next_gate: G14
content_sha256: a75943c3f590935fd8ed5fec7b486edc7313db9027c6edbe1ca757a843da7f7c
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Vincular inputs, herramienta, versión, parámetros, outputs, hashes y errores del run. Decisión pendiente en G14; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Verifier y Guardian. Consumidores: P07, P08. Foco: activo material, variante, procedencia, continuidad y paquete companion.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: creative-spec-v1, continuity-bible-v1, capability-report-v1. Un activo solo deja DRAFT cuando existe material y su hash fue leído del disco.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- run-id: ⟦UNKNOWN:run-id⟧
- tool: ⟦UNKNOWN:tool⟧
- version: ⟦UNKNOWN:version⟧
- input-hashes: ⟦UNKNOWN:input-hashes⟧
- parameters: ⟦UNKNOWN:parameters⟧
- output-hashes: ⟦UNKNOWN:output-hashes⟧
- errors: ⟦UNKNOWN:errors⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html, json. Familias: other. Foco: activo material, variante, procedencia, continuidad y paquete companion.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S02: Producir o capturar activos por etapas. Stop: Limitar a prototipo no publicable si persiste riesgo o falta capacidad.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S02: owner content-os-remotion-create; apoyos content-os-media; verifier RT-09.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear activos inexistentes, hashes sintéticos y companions divergentes. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: run-id, tool, version, input-hashes, parameters, output-hashes, errors. Gate: G14.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P06 → P07, P08. DRAFT; gate G14.
