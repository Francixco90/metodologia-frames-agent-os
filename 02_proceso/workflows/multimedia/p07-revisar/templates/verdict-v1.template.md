---
schema_version: frames-deliverable-v1
instance_id: DELIV-P07-VERDICT
deliverable_id: verdict-v1
display_name: Veredicto · Template
workflow_id: P07
deliverable_class: review
touchpoint: final
identity:
  brand: MetodologIA
  owner: Dirección editorial y QC
audience: Producer, lead y aprobador.
purpose: Emitir PASS, REVISE o BLOCKED con evidencia y siguiente gate, sin remediar.
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
  - source_id: generator-workflow-p07
    ref: 02_proceso/workflows/multimedia/p07-revisar/workflow.yml
    sha256: ff162637cee2bf7d6d292f5b503a01ae830c802d21873a736bb5df612b995d70
    authority: verified
    rights: cleared
formats:
  - md
  - html
  - json
piece_families:
  - other
companion_for: null
skills:
  - content-os-core
  - design-audit-genjutsu
fields:
  - field_id: candidate-hash
    label: candidate-hash
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:candidate-hash⟧
    source_refs: []
  - field_id: decision
    label: decision
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:decision⟧
    source_refs: []
  - field_id: evidence
    label: evidence
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:evidence⟧
    source_refs: []
  - field_id: blockers
    label: blockers
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:blockers⟧
    source_refs: []
  - field_id: limitations
    label: limitations
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:limitations⟧
    source_refs: []
  - field_id: next-gate
    label: next-gate
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:next-gate⟧
    source_refs: []
state: DRAFT
next_gate: G14
content_sha256: 2cb0b1afbe156b694fcc5166f0141f300f798cc2d767fbe4d655483f77745260
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Emitir PASS, REVISE o BLOCKED con evidencia y siguiente gate, sin remediar. Decisión pendiente en G14; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Producer, lead y aprobador. Consumidores: P08, human. Foco: hallazgos, severidad, evidencia, decisión y alcance de verificación.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: review-report-v1, claim-register-v1, asset-manifest-v1. Cada veredicto debe enlazar evidencia material y checks realmente ejecutados.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- candidate-hash: ⟦UNKNOWN:candidate-hash⟧
- decision: ⟦UNKNOWN:decision⟧
- evidence: ⟦UNKNOWN:evidence⟧
- blockers: ⟦UNKNOWN:blockers⟧
- limitations: ⟦UNKNOWN:limitations⟧
- next-gate: ⟦UNKNOWN:next-gate⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html, json. Familias: other. Foco: hallazgos, severidad, evidencia, decisión y alcance de verificación.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S02: Verificar evidencia, derechos y accesibilidad. Stop: UNKNOWN, evidencia ausente o check manual no ejecutado bloquean.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S02: owner content-os-core; apoyos design-audit-genjutsu; verifier RT-11.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear aprobación ante UNKNOWN, cobertura incompleta o autoevaluación. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: candidate-hash, decision, evidence, blockers, limitations, next-gate. Gate: G14.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P07 → P08, human. DRAFT; gate G14.
