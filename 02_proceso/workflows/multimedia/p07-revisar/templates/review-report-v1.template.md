---
schema_version: frames-deliverable-v1
instance_id: DELIV-P07-REVIEW-REPORT
deliverable_id: review-report-v1
display_name: Reporte de revisión · Template
workflow_id: P07
deliverable_class: review
touchpoint: final
identity:
  brand: MetodologIA
  owner: Dirección editorial y QC
audience: Producer, cliente y aprobador.
purpose: Evaluar contenido, marca, evidencia, derechos, accesibilidad y calidad visual.
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
  - image
  - miniclip
  - graphic
  - carousel
  - story
  - presentation
companion_for: null
skills:
  - design-audit-genjutsu
  - content-os-core
fields:
  - field_id: candidate-ref
    label: candidate-ref
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:candidate-ref⟧
    source_refs: []
  - field_id: content-findings
    label: content-findings
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:content-findings⟧
    source_refs: []
  - field_id: brand-findings
    label: brand-findings
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:brand-findings⟧
    source_refs: []
  - field_id: evidence-findings
    label: evidence-findings
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:evidence-findings⟧
    source_refs: []
  - field_id: rights-findings
    label: rights-findings
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:rights-findings⟧
    source_refs: []
  - field_id: accessibility-findings
    label: accessibility-findings
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:accessibility-findings⟧
    source_refs: []
  - field_id: visual-findings
    label: visual-findings
    value_type: text
    status: unknown
    value: ⟦UNKNOWN:visual-findings⟧
    source_refs: []
state: DRAFT
next_gate: G14
content_sha256: 2c4c692096e53ad6af9635813a97dab241e9dbeccade7f213c6303bb7f42bb7e
---

## Resultado y decisión

Expresar el resultado esperado, la decisión pendiente y el límite de autoridad.

Evaluar contenido, marca, evidencia, derechos, accesibilidad y calidad visual. Decisión pendiente en G14; este DRAFT no concede aprobación.

## Audiencia y uso

Precisar quién usa el entregable, para qué decisión y quién lo consume después.

Producer, cliente y aprobador. Consumidores: P08, human. Foco: hallazgos, severidad, evidencia, decisión y alcance de verificación.

## Entradas, evidencia y supuestos

Distinguir inputs declarados, evidencia material, supuestos y gaps bloqueantes.

Inputs: asset-package-v1, asset-manifest-v1. Cada veredicto debe enlazar evidencia material y checks realmente ejecutados.

## Contenido estructurado

Exponer cada campo contractual sin completar valores desconocidos por inferencia.

- candidate-ref: ⟦UNKNOWN:candidate-ref⟧
- content-findings: ⟦UNKNOWN:content-findings⟧
- brand-findings: ⟦UNKNOWN:brand-findings⟧
- evidence-findings: ⟦UNKNOWN:evidence-findings⟧
- rights-findings: ⟦UNKNOWN:rights-findings⟧
- accessibility-findings: ⟦UNKNOWN:accessibility-findings⟧
- visual-findings: ⟦UNKNOWN:visual-findings⟧

## Componentes, activos y prompts

Enumerar componentes y familias de pieza sin fabricar activos ni prompts finales.

Formatos: md, html. Familias: image, miniclip, graphic, carousel, story, presentation. Foco: hallazgos, severidad, evidencia, decisión y alcance de verificación.

## Secuencia, hitos y dependencias

Vincular los pasos productores, sus dependencias y sus condiciones de parada.

- S01: Revisar contenido y marca solo sobre material observable. Stop: Solicitar copia o descripción si el material no abre; nunca inventar.

## Skills, ownership y handoffs

Declarar skill principal, apoyos, verifier y consumidores del handoff.

- S01: owner design-audit-genjutsu; apoyos content-os-core; verifier RT-11.

## Riesgos, límites y casos borde

Registrar el riesgo dominante, límites de uso y comportamiento fail-closed.

Bloquear aprobación ante UNKNOWN, cobertura incompleta o autoevaluación. UNKNOWN conserva DRAFT/BLOCKED; sin publicación.

## Criterios de aceptación y QA

Convertir campos, gate y evidencia requerida en comprobaciones observables.

Campos: candidate-ref, content-findings, brand-findings, evidence-findings, rights-findings, accessibility-findings, visual-findings. Gate: G14.

## Estado, lineage y siguiente gate

Conservar DRAFT, lineage del workflow y siguiente gate sin autoaprobar.

P07 → P08, human. DRAFT; gate G14.
