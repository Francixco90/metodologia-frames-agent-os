---
template_id: dual-oracle-review-v1
schema_version: skill-systems-template-model-v1
state: DRAFT
owner: skill-security-auditor
model_sha256: b79d33438ae889f66a3ee61a0881324ac842940352ace9769a892f941d2ba3b7
---

# Revisión con dos oráculos

Validar un candidate con contratos Frames y criterios PIVOTE sin promediar conflictos.

## 1. Candidate congelado

> Registra ref, hash, producer, base y alcance accesible.

⟦FIELD:candidate⟧

## 2. Oráculo Frames

> Aplica autoridad, contratos, effects, paths, receipts y lifecycle.

⟦FIELD:frames⟧

## 3. Oráculo PIVOTE

> Aplica UCC, rights, accessibility, security, provenance y recovery.

⟦FIELD:pivote⟧

## 4. Evidencia observada

> Lista materiales realmente accesibles y denominador.

⟦FIELD:evidence⟧

## 5. Diferencias y conflictos

> Explica desacuerdos sin ocultarlos con un score.

⟦FIELD:differences⟧

## 6. Casos adversariales

> Prueba injection, secrets, supply chain, authority y sandbox.

⟦FIELD:adversarial⟧

## 7. Correcciones mínimas

> Prioriza hasta cinco cambios y revalidación adyacente.

⟦FIELD:corrections⟧

## 8. Veredicto y siguiente gate

> Emite PASS REVISE BLOCKED o UNKNOWN con actor independiente.

⟦FIELD:verdict⟧

<!-- skill-systems-template-data:{"schema_version":"skill-systems-template-model-v1","template_id":"dual-oracle-review-v1","title":"Revisión con dos oráculos","purpose":"Validar un candidate con contratos Frames y criterios PIVOTE sin promediar conflictos.","owner":"skill-security-auditor","sections":[{"id":"candidate","title":"Candidate congelado","prompt":"Registra ref, hash, producer, base y alcance accesible."},{"id":"frames","title":"Oráculo Frames","prompt":"Aplica autoridad, contratos, effects, paths, receipts y lifecycle."},{"id":"pivote","title":"Oráculo PIVOTE","prompt":"Aplica UCC, rights, accessibility, security, provenance y recovery."},{"id":"evidence","title":"Evidencia observada","prompt":"Lista materiales realmente accesibles y denominador."},{"id":"differences","title":"Diferencias y conflictos","prompt":"Explica desacuerdos sin ocultarlos con un score."},{"id":"adversarial","title":"Casos adversariales","prompt":"Prueba injection, secrets, supply chain, authority y sandbox."},{"id":"corrections","title":"Correcciones mínimas","prompt":"Prioriza hasta cinco cambios y revalidación adyacente."},{"id":"verdict","title":"Veredicto y siguiente gate","prompt":"Emite PASS REVISE BLOCKED o UNKNOWN con actor independiente."}]} -->
