---
schema_version: frames-deliverable-v1
instance_id: DELIV-P02-OPPORTUNITY-MAP
deliverable_id: opportunity-map-v1
display_name: Mapa de oportunidades · Template
workflow_id: P02
deliverable_class: research
touchpoint: final
identity:
  brand: MetodologIA
  owner: Investigación editorial
audience: Estratega y sponsor.
purpose: Priorizar problemas, audiencias, mensajes y formatos respaldados por evidencia.
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
  - source_id: generator-workflow-p02
    ref: 02_proceso/workflows/multimedia/p02-investigar/workflow.yml
    sha256: 4faa7d30f89660ccff552c657c16adce68b709dc736f3645a7369a9aea34cc91
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
  - content-os-core
  - content-os-registry
fields:
  - field_id: opportunity
    label: opportunity
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:opportunity⟧
    source_refs: []
  - field_id: audience
    label: audience
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:audience⟧
    source_refs: []
  - field_id: evidence
    label: evidence
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:evidence⟧
    source_refs: []
  - field_id: value
    label: value
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:value⟧
    source_refs: []
  - field_id: effort
    label: effort
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:effort⟧
    source_refs: []
  - field_id: risk
    label: risk
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:risk⟧
    source_refs: []
  - field_id: priority
    label: priority
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:priority⟧
    source_refs: []
state: DRAFT
next_gate: G14
content_sha256: 7f25bb67ac38f64d9ccd57ba608956cbcda7a219d82644d92b314a65e719b56e
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Priorizar problemas, audiencias, mensajes y formatos respaldados por evidencia. Decisión pendiente en G14; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Estratega y sponsor. Consumidores: P03, human. Foco: preguntas, claims, evidencia, límites y oportunidades justificadas.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: claim-register-v1, question-bank-v1, opportunity-source-receipt-v1. Separar evidencia observada, inferencia y preguntas todavía abiertas.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- opportunity: ⟦UNKNOWN:opportunity⟧
- audience: ⟦UNKNOWN:audience⟧
- evidence: ⟦UNKNOWN:evidence⟧
- value: ⟦UNKNOWN:value⟧
- effort: ⟦UNKNOWN:effort⟧
- risk: ⟦UNKNOWN:risk⟧
- priority: ⟦UNKNOWN:priority⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html. Familias: image, miniclip, graphic, carousel, story, presentation. Foco: preguntas, claims, evidencia, límites y oportunidades justificadas.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S03: Materializar Opportunity Map V2 y derivar su proyección V1 exacta. Stop: Bloquear si assertOpportunityMapV2 no valida receipt, bytes de fuente y hash exacto de opportunity-map-v1.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S03: owner content-os-core; apoyos content-os-registry; verifier RT-09.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear claims sin fuente y síntesis que exceda la evidencia disponible. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: opportunity, audience, evidence, value, effort, risk, priority. Gate: G14.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P02 → P03, human. DRAFT; gate G14.
