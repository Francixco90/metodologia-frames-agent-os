---
name: skill-release-governor
description: This skill should be used when se necesite empaquetar, versionar, superseder, retirar, restaurar o preparar promoción de una skill. Coordina los pasos S08, S09 sin ampliar autoridad.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# skill-release-governor

## Operación

Lee [context.md](context.md). Congelar capsule, compatibilidad, rollback, lifecycle H-03 e inventarios. [METODOLOGIA][CONFIG]

1. Verifica route lock, actor, fuentes, candidate y efecto.
2. Consume únicamente: skill-candidate, review-report, documentation-closure.
3. Ejecuta el paso S08 → S09 sin asumir permisos.
4. Produce: skill-release-capsule-v1, lifecycle-events, restore-plan.
5. Relee hashes, declara gaps y entrega al verifier indicado.

Consulta [references/operating-contract.md](references/operating-contract.md) solo cuando necesites invariantes y recuperación.

## Límite

Capsule inmutable; H01 no se sustituye y ningún host sin probe pasa. No instala, publica, conecta ni promueve. RT-09, RT-11 y H01 permanecen actores separados.
