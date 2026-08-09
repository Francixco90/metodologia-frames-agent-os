---
schema_version: frames-deliverable-v1
instance_id: DELIV-P05-CREATIVE-SPEC
deliverable_id: creative-spec-v1
display_name: Especificación creativa · Template
workflow_id: P05
deliverable_class: creative-spec
touchpoint: final
identity:
  brand: MetodologIA
  owner: Guion y diseño multimedia
audience: Productores visuales, copy y motion.
purpose: Definir narrativa, formato, estructura, copy, visuales, audio, CTA y aceptación de la pieza.
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
  - source_id: generator-workflow-p05
    ref: 02_proceso/workflows/multimedia/p05-disenar-pieza/workflow.yml
    sha256: 1360dde664b7bf1e409d2520a4062df3bd217b949497d192be48ed3666906ea6
    authority: verified
    rights: cleared
formats:
  - md
  - html
piece_families:
  - image
  - miniclip
  - graphic
  - carousel
  - story
  - presentation
companion_for: null
skills:
  - content-os-creative
  - design-compose-graphics
fields:
  - field_id: piece-objective
    label: piece-objective
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:piece-objective⟧
    source_refs: []
  - field_id: narrative
    label: narrative
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:narrative⟧
    source_refs: []
  - field_id: format
    label: format
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:format⟧
    source_refs: []
  - field_id: structure
    label: structure
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:structure⟧
    source_refs: []
  - field_id: copy
    label: copy
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:copy⟧
    source_refs: []
  - field_id: visual-direction
    label: visual-direction
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:visual-direction⟧
    source_refs: []
  - field_id: audio
    label: audio
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:audio⟧
    source_refs: []
  - field_id: cta
    label: cta
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:cta⟧
    source_refs: []
  - field_id: acceptance
    label: acceptance
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:acceptance⟧
    source_refs: []
state: DRAFT
next_gate: G14
content_sha256: cb29541887d9aae644670b1cedcf5ca1580456aea1a041b553cc53529e19b06b
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Definir narrativa, formato, estructura, copy, visuales, audio, CTA y aceptación de la pieza. Decisión pendiente en G14; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Productores visuales, copy y motion. Consumidores: P06, P07, human. Foco: medio, narrativa, continuidad, mapa de activos y especificación producible.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: brief-campaign-map-v1, definition-of-ready-v1. Toda especificación debe resolver al brief y a restricciones aprobadas.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- piece-objective: ⟦UNKNOWN:piece-objective⟧
- narrative: ⟦UNKNOWN:narrative⟧
- format: ⟦UNKNOWN:format⟧
- structure: ⟦UNKNOWN:structure⟧
- copy: ⟦UNKNOWN:copy⟧
- visual-direction: ⟦UNKNOWN:visual-direction⟧
- audio: ⟦UNKNOWN:audio⟧
- cta: ⟦UNKNOWN:cta⟧
- acceptance: ⟦UNKNOWN:acceptance⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html. Familias: image, miniclip, graphic, carousel, story, presentation. Foco: medio, narrativa, continuidad, mapa de activos y especificación producible.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S01: Elegir medio y ruta creativa desde el brief aprobado. Stop: Crear un prototipo de bajo costo si el medio no puede justificarse.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S01: owner content-os-creative; apoyos design-compose-graphics; verifier RT-09.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear contradicciones de continuidad, formato o identidad. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: piece-objective, narrative, format, structure, copy, visual-direction, audio, cta, acceptance. Gate: G14.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P05 → P06, P07, human. DRAFT; gate G14.
