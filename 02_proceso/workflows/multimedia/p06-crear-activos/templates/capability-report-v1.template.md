---
schema_version: frames-deliverable-v1
instance_id: DELIV-P06-CAPABILITY-REPORT
deliverable_id: capability-report-v1
display_name: Reporte de capacidad · Template
workflow_id: P06
deliverable_class: asset
touchpoint: intermediate
identity:
  brand: MetodologIA
  owner: Generación y captura
audience: Producer, lead y cliente.
purpose: Declarar qué pudo producirse, qué quedó bloqueado y qué requiere una ruta alternativa.
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
piece_families:
  - other
companion_for: null
skills:
  - content-os-core
  - content-os-media
fields:
  - field_id: requested-capability
    label: requested-capability
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:requested-capability⟧
    source_refs: []
  - field_id: available-capability
    label: available-capability
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:available-capability⟧
    source_refs: []
  - field_id: result
    label: result
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:result⟧
    source_refs: []
  - field_id: gaps
    label: gaps
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:gaps⟧
    source_refs: []
  - field_id: fallback
    label: fallback
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:fallback⟧
    source_refs: []
  - field_id: decision
    label: decision
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:decision⟧
    source_refs: []
state: DRAFT
next_gate: G14
content_sha256: a594da12e6b184ea26825c28199dae4083ed161a5ad180db870e4251ba8bc80f
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Declarar qué pudo producirse, qué quedó bloqueado y qué requiere una ruta alternativa. Decisión pendiente en G14; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Producer, lead y cliente. Consumidores: P07, human. Foco: activo material, variante, procedencia, continuidad y paquete companion.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: creative-spec-v1, asset-map-v1. Un activo solo deja DRAFT cuando existe material y su hash fue leído del disco.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- requested-capability: ⟦UNKNOWN:requested-capability⟧
- available-capability: ⟦UNKNOWN:available-capability⟧
- result: ⟦UNKNOWN:result⟧
- gaps: ⟦UNKNOWN:gaps⟧
- fallback: ⟦UNKNOWN:fallback⟧
- decision: ⟦UNKNOWN:decision⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html. Familias: other. Foco: activo material, variante, procedencia, continuidad y paquete companion.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S01: Ejecutar preflight de capacidad, derechos y herramientas. Stop: Bloquear herramienta, fuente o activo no autorizado.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S01: owner content-os-core; apoyos content-os-media; verifier RT-09.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear activos inexistentes, hashes sintéticos y companions divergentes. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: requested-capability, available-capability, result, gaps, fallback, decision. Gate: G14.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P06 → P07, human. DRAFT; gate G14.
