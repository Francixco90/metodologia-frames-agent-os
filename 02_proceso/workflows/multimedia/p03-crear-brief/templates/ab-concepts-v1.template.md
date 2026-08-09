---
schema_version: frames-deliverable-v1
instance_id: DELIV-P03-AB-CONCEPTS
deliverable_id: ab-concepts-v1
display_name: Conceptos A/B · Template
workflow_id: P03
deliverable_class: strategy
touchpoint: intermediate
identity:
  brand: MetodologIA
  owner: Arquitectura editorial
audience: Cliente y dirección creativa.
purpose: Comparar dos rutas creativas con hipótesis, evidencia, coste, riesgo y criterio de decisión.
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
  - source_id: generator-workflow-p03
    ref: 02_proceso/workflows/multimedia/p03-crear-brief/workflow.yml
    sha256: ba2face5692381cdc2b946fd5b1780d4fc379b4c66aa37d2b9a5d783330b837f
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
companion_for: null
skills:
  - content-os-creative
  - content-os-product-launch-video
fields:
  - field_id: concept-a
    label: concept-a
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:concept-a⟧
    source_refs: []
  - field_id: concept-b
    label: concept-b
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:concept-b⟧
    source_refs: []
  - field_id: hypothesis
    label: hypothesis
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:hypothesis⟧
    source_refs: []
  - field_id: invariant-claims
    label: invariant-claims
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:invariant-claims⟧
    source_refs: []
  - field_id: cost
    label: cost
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:cost⟧
    source_refs: []
  - field_id: risk
    label: risk
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:risk⟧
    source_refs: []
  - field_id: decision-criteria
    label: decision-criteria
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:decision-criteria⟧
    source_refs: []
state: DRAFT
next_gate: MW_BRIEF_APPROVED
content_sha256: 0eb507c869497f0d5be6269c14c3559f49d77d5c5adf5002962b1f5bc0a7f845
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Comparar dos rutas creativas con hipótesis, evidencia, coste, riesgo y criterio de decisión. Decisión pendiente en MW_BRIEF_APPROVED; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Cliente y dirección creativa. Consumidores: P05, human. Foco: objetivo, audiencia, arquitectura de pieza, alternativas y decisión.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: brief-campaign-map-v1. Cada decisión estratégica debe citar el input que la habilita.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- concept-a: ⟦UNKNOWN:concept-a⟧
- concept-b: ⟦UNKNOWN:concept-b⟧
- hypothesis: ⟦UNKNOWN:hypothesis⟧
- invariant-claims: ⟦UNKNOWN:invariant-claims⟧
- cost: ⟦UNKNOWN:cost⟧
- risk: ⟦UNKNOWN:risk⟧
- decision-criteria: ⟦UNKNOWN:decision-criteria⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html. Familias: image, miniclip, graphic, carousel, story. Foco: objetivo, audiencia, arquitectura de pieza, alternativas y decisión.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S03: Definir conceptos A/B, riesgos y criterios de éxito. Stop: Bloquear conceptos que alteren claims o excedan restricciones.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S03: owner content-os-creative; apoyos content-os-product-launch-video; verifier RT-09.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear estrategia sin objetivo, audiencia o suficiencia de evidencia. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: concept-a, concept-b, hypothesis, invariant-claims, cost, risk, decision-criteria. Gate: MW_BRIEF_APPROVED.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P03 → P05, human. DRAFT; gate MW_BRIEF_APPROVED.
