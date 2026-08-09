---
name: frames-harness-maintainer
description: This skill should be used when the user asks to "corregir Frames", "evolucionar el harness", "hacer mantenimiento del repositorio", "migrar una capacidad", "deprecar un componente", or close a corrective or evolutionary change with transversal documentation.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Frames Harness Maintainer

## Contexto operativo

Lee [`context.md`](context.md). Opera R9/M00–M06 para cambios correctivos o evolutivos sin confundir reparación, verificación, promoción y publicación. [METODOLOGIA][CONFIG]

## Procedimiento

1. Congela base, alcance, owner, inventario y write set.
2. Clasifica `CREATE|EXPAND|EXTEND|CORRECT|MIGRATE|DEPRECATE`.
3. Prepara diagnóstico, pruebas de regresión y `DocumentationImpactPlanV1`.
4. Espera `HM_CHANGE_APPROVED`; después implementa el cambio mínimo.
5. Congela candidate y separa producer, RT-09 y RT-11.
6. Sincroniza documentación, secuencias e inventarios y verifica el receipt.
7. Entrega rollback y siguiente gate; no hace commit, push, merge o publicación por inferencia.

Abre [`references/operating-contract.md`](references/operating-contract.md) para DoD y fallos.

## Invariantes

- Un bug observable incluye regresión y recuperación útil.
- `NOT_APPLICABLE` necesita reason code verificable.
- Un cambio sin `DocumentationClosureReceiptV1` no está terminado.
- Cambios después del freeze crean successor.
- `HM_PROMOTION_APPROVED` es independiente de `HM_CHANGE_APPROVED`.

## Salida

Devuelve base/head, clasificación, impacto, archivos, validaciones, riesgos, gaps, rollback, closure receipt y siguiente gate.
