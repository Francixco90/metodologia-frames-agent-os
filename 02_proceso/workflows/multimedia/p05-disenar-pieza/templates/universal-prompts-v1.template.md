---
schema_version: frames-deliverable-v1
instance_id: DELIV-P05-UNIVERSAL-PROMPTS
deliverable_id: universal-prompts-v1
display_name: Pack de prompts de producción · Template
workflow_id: P05
deliverable_class: prompt-pack
touchpoint: final
identity:
  brand: MetodologIA
  owner: Guion y diseño multimedia
audience: Operadores de herramientas generativas y verifier.
purpose: Proveer prompts trazables para imágenes, miniclips, gráficas, carruseles e historias.
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
  - json
piece_families:
  - image
  - miniclip
  - graphic
  - carousel
  - story
companion_for: null
skills:
  - design-compose-graphics
  - content-os-remotion-bridge
fields:
  - field_id: piece-family
    label: piece-family
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:piece-family⟧
    source_refs: []
  - field_id: objective
    label: objective
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:objective⟧
    source_refs: []
  - field_id: input-refs
    label: input-refs
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:input-refs⟧
    source_refs: []
  - field_id: prompt
    label: prompt
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:prompt⟧
    source_refs: []
  - field_id: negative-constraints
    label: negative-constraints
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:negative-constraints⟧
    source_refs: []
  - field_id: parameters
    label: parameters
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:parameters⟧
    source_refs: []
  - field_id: expected-output
    label: expected-output
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:expected-output⟧
    source_refs: []
  - field_id: acceptance
    label: acceptance
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:acceptance⟧
    source_refs: []
state: DRAFT
next_gate: G14
content_sha256: d0df69693834a4aa7879b562ba18bffdb44e54d83dc28cd305ef34a7271a6c96
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Proveer prompts trazables para imágenes, miniclips, gráficas, carruseles e historias. Decisión pendiente en G14; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Operadores de herramientas generativas y verifier. Consumidores: P06, human. Foco: prompts, variables, negativos, inputs, outputs y criterios de repetibilidad.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: creative-spec-v1, continuity-bible-v1. Los prompts deben ligar variables y referencias al spec, sin datos privados.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- piece-family: ⟦UNKNOWN:piece-family⟧
- objective: ⟦UNKNOWN:objective⟧
- input-refs: ⟦UNKNOWN:input-refs⟧
- prompt: ⟦UNKNOWN:prompt⟧
- negative-constraints: ⟦UNKNOWN:negative-constraints⟧
- parameters: ⟦UNKNOWN:parameters⟧
- expected-output: ⟦UNKNOWN:expected-output⟧
- acceptance: ⟦UNKNOWN:acceptance⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html, json. Familias: image, miniclip, graphic, carousel, story. Foco: prompts, variables, negativos, inputs, outputs y criterios de repetibilidad.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S03: Mapear activos, prompts y derivados. Stop: Bloquear cualquier activo sin fuente, owner, formato o criterio de aceptación.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S03: owner design-compose-graphics; apoyos content-os-remotion-bridge; verifier RT-09.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear prompts ambiguos, no reproducibles o con efectos no autorizados. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: piece-family, objective, input-refs, prompt, negative-constraints, parameters, expected-output, acceptance. Gate: G14.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P05 → P06, human. DRAFT; gate G14.
