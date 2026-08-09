---
schema_version: frames-deliverable-v1
instance_id: DELIV-P00-BRAND-CHARTER
deliverable_id: brand-charter-v1
display_name: Charter de marca · Template
workflow_id: P00
deliverable_class: brand
touchpoint: final
identity:
  brand: MetodologIA
  owner: Marca y dirección creativa
audience: Owner de marca, equipo creativo y aprobadores.
purpose: Alinear identidad, promesa, audiencia, voz, canales, límites y autoridad de marca.
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
  - pdf
piece_families:
  - other
companion_for: null
skills:
  - metodologia-brand-router
fields:
  - field_id: brand-purpose
    label: brand-purpose
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:brand-purpose⟧
    source_refs: []
  - field_id: audience
    label: audience
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:audience⟧
    source_refs: []
  - field_id: promise
    label: promise
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:promise⟧
    source_refs: []
  - field_id: voice
    label: voice
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:voice⟧
    source_refs: []
  - field_id: channels
    label: channels
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:channels⟧
    source_refs: []
  - field_id: visual-system
    label: visual-system
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:visual-system⟧
    source_refs: []
  - field_id: restrictions
    label: restrictions
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:restrictions⟧
    source_refs: []
  - field_id: approval-owner
    label: approval-owner
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:approval-owner⟧
    source_refs: []
state: DRAFT
next_gate: G14
content_sha256: 6fcd7885345b0e28d7389b722d437bb78f297e98daa7d34920841b7d610389d6
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Alinear identidad, promesa, audiencia, voz, canales, límites y autoridad de marca. Decisión pendiente en G14; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Owner de marca, equipo creativo y aprobadores. Consumidores: P03, P05, human. Foco: identidad, voz, sistema visual, restricciones y autoridad de marca.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: intent-envelope. Toda regla de marca debe resolver a una fuente o permanecer unknown.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- brand-purpose: ⟦UNKNOWN:brand-purpose⟧
- audience: ⟦UNKNOWN:audience⟧
- promise: ⟦UNKNOWN:promise⟧
- voice: ⟦UNKNOWN:voice⟧
- channels: ⟦UNKNOWN:channels⟧
- visual-system: ⟦UNKNOWN:visual-system⟧
- restrictions: ⟦UNKNOWN:restrictions⟧
- approval-owner: ⟦UNKNOWN:approval-owner⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html, pdf. Familias: other. Foco: identidad, voz, sistema visual, restricciones y autoridad de marca.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S01: Resolver identidad y autoridad de marca. Stop: Bloquear si identidad, autoridad o consentimiento no son inequívocos.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S01: owner metodologia-brand-router; apoyos ninguno; verifier RT-09.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear mezcla de marcas, claims no aprobados y tokens sin autoridad. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: brand-purpose, audience, promise, voice, channels, visual-system, restrictions, approval-owner. Gate: G14.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P00 → P03, P05, human. DRAFT; gate G14.
