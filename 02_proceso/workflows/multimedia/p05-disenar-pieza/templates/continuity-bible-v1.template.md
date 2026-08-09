---
schema_version: frames-deliverable-v1
instance_id: DELIV-P05-CONTINUITY-BIBLE
deliverable_id: continuity-bible-v1
display_name: Biblia de continuidad · Template
workflow_id: P05
deliverable_class: creative-spec
touchpoint: intermediate
identity:
  brand: MetodologIA
  owner: Guion y diseño multimedia
audience: Producer de series y motion.
purpose: Mantener personajes, objetos, estilo, secuencia, claims y transiciones coherentes.
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
  - miniclip
  - carousel
  - story
companion_for: null
skills:
  - content-os-motion-graphics
  - content-os-creative
fields:
  - field_id: entities
    label: entities
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:entities⟧
    source_refs: []
  - field_id: style-rules
    label: style-rules
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:style-rules⟧
    source_refs: []
  - field_id: chronology
    label: chronology
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:chronology⟧
    source_refs: []
  - field_id: continuity-rules
    label: continuity-rules
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:continuity-rules⟧
    source_refs: []
  - field_id: claim-locks
    label: claim-locks
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:claim-locks⟧
    source_refs: []
  - field_id: exceptions
    label: exceptions
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:exceptions⟧
    source_refs: []
state: DRAFT
next_gate: G14
content_sha256: 083765a302f6b0116aae1e14507ea6840fcc74d50bbfa15300863e4fb5a9e6e2
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Mantener personajes, objetos, estilo, secuencia, claims y transiciones coherentes. Decisión pendiente en G14; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Producer de series y motion. Consumidores: P06, P07, P08. Foco: medio, narrativa, continuidad, mapa de activos y especificación producible.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: creative-spec-v1, claim-register-v1. Toda especificación debe resolver al brief y a restricciones aprobadas.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- entities: ⟦UNKNOWN:entities⟧
- style-rules: ⟦UNKNOWN:style-rules⟧
- chronology: ⟦UNKNOWN:chronology⟧
- continuity-rules: ⟦UNKNOWN:continuity-rules⟧
- claim-locks: ⟦UNKNOWN:claim-locks⟧
- exceptions: ⟦UNKNOWN:exceptions⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html. Familias: miniclip, carousel, story. Foco: medio, narrativa, continuidad, mapa de activos y especificación producible.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S02: Diseñar narrativa, secuencia y continuidad. Stop: Bloquear si la narrativa altera claims o rompe continuidad.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S02: owner content-os-motion-graphics; apoyos content-os-creative; verifier RT-09.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear contradicciones de continuidad, formato o identidad. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: entities, style-rules, chronology, continuity-rules, claim-locks, exceptions. Gate: G14.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P05 → P06, P07, P08. DRAFT; gate G14.
