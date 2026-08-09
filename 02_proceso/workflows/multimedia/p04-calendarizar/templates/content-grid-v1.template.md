---
schema_version: frames-deliverable-v1
instance_id: DELIV-P04-CONTENT-GRID
deliverable_id: content-grid-v1
display_name: Parrilla de contenidos · Template
workflow_id: P04
deliverable_class: planning
touchpoint: final
identity:
  brand: MetodologIA
  owner: Operaciones de contenido
audience: Content manager, productor y cliente.
purpose: Mapear cada publicación a audiencia, objetivo, canal, formato, hook, CTA, fuente y métrica.
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
  - source_id: generator-workflow-p04
    ref: 02_proceso/workflows/multimedia/p04-calendarizar/workflow.yml
    sha256: 89318760b114f8c344b7bffd46a38e16861e25a5554f8d180d760a82f4eb4f19
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
  - dev-executing-plans
  - content-os-core
fields:
  - field_id: slot
    label: slot
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:slot⟧
    source_refs: []
  - field_id: audience
    label: audience
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:audience⟧
    source_refs: []
  - field_id: objective
    label: objective
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:objective⟧
    source_refs: []
  - field_id: channel
    label: channel
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:channel⟧
    source_refs: []
  - field_id: piece-family
    label: piece-family
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:piece-family⟧
    source_refs: []
  - field_id: hook
    label: hook
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:hook⟧
    source_refs: []
  - field_id: cta
    label: cta
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:cta⟧
    source_refs: []
  - field_id: source-ref
    label: source-ref
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:source-ref⟧
    source_refs: []
  - field_id: metric
    label: metric
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:metric⟧
    source_refs: []
state: DRAFT
next_gate: G14
content_sha256: 378f8bb82138bd4c34b2cfe4c6892ee7af2ad641749fd00f35efabc7b6ad94b8
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Mapear cada publicación a audiencia, objetivo, canal, formato, hook, CTA, fuente y métrica. Decisión pendiente en G14; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Content manager, productor y cliente. Consumidores: P05, P06, P09, human. Foco: prioridades, hitos, dependencias, capacidad, medición y stop rules.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: brief-campaign-map-v1, definition-of-ready-v1. Fechas y capacidad permanecen unknown hasta tener owner y restricción verificable.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- slot: ⟦UNKNOWN:slot⟧
- audience: ⟦UNKNOWN:audience⟧
- objective: ⟦UNKNOWN:objective⟧
- channel: ⟦UNKNOWN:channel⟧
- piece-family: ⟦UNKNOWN:piece-family⟧
- hook: ⟦UNKNOWN:hook⟧
- cta: ⟦UNKNOWN:cta⟧
- source-ref: ⟦UNKNOWN:source-ref⟧
- metric: ⟦UNKNOWN:metric⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html, csv. Familias: image, miniclip, graphic, carousel, story. Foco: prioridades, hitos, dependencias, capacidad, medición y stop rules.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S01: Priorizar entregables y secuencia de producción. Stop: Omitir P04 para una pieza única sin dependencias ni calendario.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S01: owner dev-executing-plans; apoyos content-os-core; verifier RT-11.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear secuencias imposibles, dependencias omitidas y capacidad inventada. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: slot, audience, objective, channel, piece-family, hook, cta, source-ref, metric. Gate: G14.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P04 → P05, P06, P09, human. DRAFT; gate G14.
