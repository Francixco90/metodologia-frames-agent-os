---
schema_version: frames-deliverable-v1
instance_id: DELIV-P07-TOP5-CHANGES
deliverable_id: top5-changes-v1
display_name: Cambios prioritarios · Template
workflow_id: P07
deliverable_class: review
touchpoint: intermediate
identity:
  brand: MetodologIA
  owner: Dirección editorial y QC
audience: Editor y producer.
purpose: Priorizar hasta cinco cambios por impacto, evidencia, owner y riesgo de regresión.
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
piece_families:
  - other
companion_for: null
skills:
  - design-audit-genjutsu
  - content-os-core
fields:
  - field_id: change
    label: change
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:change⟧
    source_refs: []
  - field_id: rationale
    label: rationale
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:rationale⟧
    source_refs: []
  - field_id: evidence
    label: evidence
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:evidence⟧
    source_refs: []
  - field_id: priority
    label: priority
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:priority⟧
    source_refs: []
  - field_id: owner
    label: owner
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:owner⟧
    source_refs: []
  - field_id: regression-risk
    label: regression-risk
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:regression-risk⟧
    source_refs: []
state: DRAFT
next_gate: G14
content_sha256: 38bd3be2f2b0eb864fd52542992d8de49af17dec7b646d05139f35210f07e864
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Priorizar hasta cinco cambios por impacto, evidencia, owner y riesgo de regresión. Decisión pendiente en G14; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Editor y producer. Consumidores: P08. Foco: hallazgos, severidad, evidencia, decisión y alcance de verificación.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: review-report-v1, verdict-v1. Cada veredicto debe enlazar evidencia material y checks realmente ejecutados.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- change: ⟦UNKNOWN:change⟧
- rationale: ⟦UNKNOWN:rationale⟧
- evidence: ⟦UNKNOWN:evidence⟧
- priority: ⟦UNKNOWN:priority⟧
- owner: ⟦UNKNOWN:owner⟧
- regression-risk: ⟦UNKNOWN:regression-risk⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html. Familias: other. Foco: hallazgos, severidad, evidencia, decisión y alcance de verificación.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S03: Priorizar hasta cinco correcciones verificables. Stop: No remediar desde el rol verifier; emitir REVISE o BLOCKED.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S03: owner design-audit-genjutsu; apoyos content-os-core; verifier RT-11.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear aprobación ante UNKNOWN, cobertura incompleta o autoevaluación. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: change, rationale, evidence, priority, owner, regression-risk. Gate: G14.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P07 → P08. DRAFT; gate G14.
