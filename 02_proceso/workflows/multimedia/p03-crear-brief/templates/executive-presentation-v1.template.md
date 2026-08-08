---
schema_version: frames-deliverable-v1
instance_id: DELIV-P03-EXECUTIVE-PRESENTATION
deliverable_id: executive-presentation-v1
display_name: Presentación ejecutiva · Template
workflow_id: P03
deliverable_class: strategy
touchpoint: intermediate
identity:
  brand: MetodologIA
  owner: Arquitectura editorial
audience: Sponsor y comité de decisión.
purpose: Sintetizar decisión, evidencia, propuesta, inversión, riesgos y próximos gates para liderazgo.
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
  - pptx
  - pdf
piece_families:
  - presentation
companion_for: null
skills:
  - content-os-creative
  - content-os-product-launch-video
fields:
  - field_id: executive-summary
    label: executive-summary
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:executive-summary⟧
    source_refs: []
  - field_id: problem
    label: problem
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:problem⟧
    source_refs: []
  - field_id: evidence
    label: evidence
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:evidence⟧
    source_refs: []
  - field_id: proposal
    label: proposal
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:proposal⟧
    source_refs: []
  - field_id: plan
    label: plan
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:plan⟧
    source_refs: []
  - field_id: investment
    label: investment
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:investment⟧
    source_refs: []
  - field_id: risks
    label: risks
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:risks⟧
    source_refs: []
  - field_id: decision
    label: decision
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:decision⟧
    source_refs: []
state: DRAFT
next_gate: MW_BRIEF_APPROVED
content_sha256: ae04030eb4a136c5e5d7e375bfffc1dbcb276536a050d7a537470a9843f3c5f3
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Sintetizar decisión, evidencia, propuesta, inversión, riesgos y próximos gates para liderazgo. Decisión pendiente en MW_BRIEF_APPROVED; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Sponsor y comité de decisión. Consumidores: human. Foco: objetivo, audiencia, arquitectura de pieza, alternativas y decisión.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: brief-campaign-map-v1. Cada decisión estratégica debe citar el input que la habilita.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- executive-summary: ⟦UNKNOWN:executive-summary⟧
- problem: ⟦UNKNOWN:problem⟧
- evidence: ⟦UNKNOWN:evidence⟧
- proposal: ⟦UNKNOWN:proposal⟧
- plan: ⟦UNKNOWN:plan⟧
- investment: ⟦UNKNOWN:investment⟧
- risks: ⟦UNKNOWN:risks⟧
- decision: ⟦UNKNOWN:decision⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html, pptx, pdf. Familias: presentation. Foco: objetivo, audiencia, arquitectura de pieza, alternativas y decisión.

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

Campos: executive-summary, problem, evidence, proposal, plan, investment, risks, decision. Gate: MW_BRIEF_APPROVED.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P03 → human. DRAFT; gate MW_BRIEF_APPROVED.
