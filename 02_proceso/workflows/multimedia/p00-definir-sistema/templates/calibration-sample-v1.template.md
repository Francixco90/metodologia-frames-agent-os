---
schema_version: frames-deliverable-v1
instance_id: DELIV-P00-CALIBRATION-SAMPLE
deliverable_id: calibration-sample-v1
display_name: Muestra de calibración · Template
workflow_id: P00
deliverable_class: brand
touchpoint: intermediate
identity:
  brand: MetodologIA
  owner: Marca y dirección creativa
audience: Owner de marca y productor.
purpose: Demostrar voz y sistema visual con ejemplos aprobables y contraejemplos.
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
  - source_id: generator-workflow-p00
    ref: 02_proceso/workflows/multimedia/p00-definir-sistema/workflow.yml
    sha256: 1c160fd42643c8b683b8cd95e77e927e40c2f32251b8da0552a6876ea4521da8
    authority: verified
    rights: cleared
formats:
  - md
  - html
piece_families:
  - image
  - graphic
  - other
companion_for: null
skills:
  - content-os-core
  - metodologia-brand-router
fields:
  - field_id: sample
    label: sample
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:sample⟧
    source_refs: []
  - field_id: rationale
    label: rationale
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:rationale⟧
    source_refs: []
  - field_id: anti-sample
    label: anti-sample
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:anti-sample⟧
    source_refs: []
  - field_id: evaluation-criteria
    label: evaluation-criteria
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:evaluation-criteria⟧
    source_refs: []
  - field_id: decision
    label: decision
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:decision⟧
    source_refs: []
state: DRAFT
next_gate: G14
content_sha256: 3bddac9734aa44f81ab56143f27602f720ca1bac4b15cee659e564e00aa195fd
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Demostrar voz y sistema visual con ejemplos aprobables y contraejemplos. Decisión pendiente en G14; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Owner de marca y productor. Consumidores: P03, P05, human. Foco: identidad, voz, sistema visual, restricciones y autoridad de marca.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: brand-os-v1. Toda regla de marca debe resolver a una fuente o permanecer unknown.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- sample: ⟦UNKNOWN:sample⟧
- rationale: ⟦UNKNOWN:rationale⟧
- anti-sample: ⟦UNKNOWN:anti-sample⟧
- evaluation-criteria: ⟦UNKNOWN:evaluation-criteria⟧
- decision: ⟦UNKNOWN:decision⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html. Familias: image, graphic, other. Foco: identidad, voz, sistema visual, restricciones y autoridad de marca.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S02: Definir voz, canal y audiencia sin mezclar perfiles. Stop: Bloquear ante mezcla de perfiles o contexto insuficiente.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S02: owner content-os-core; apoyos metodologia-brand-router; verifier RT-09.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear mezcla de marcas, claims no aprobados y tokens sin autoridad. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: sample, rationale, anti-sample, evaluation-criteria, decision. Gate: G14.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P00 → P03, P05, human. DRAFT; gate G14.
