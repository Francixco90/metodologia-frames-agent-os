---
name: skill-contract-validator
description: This skill should be used when se necesite validar estructura, referencias, paths, hashes, effects, fixtures o supply chain de una skill. Coordina los pasos S03, S05 sin ampliar autoridad.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# skill-contract-validator

## Operación

Lee [context.md](context.md). Ejecutar validación fail-closed de contratos y paquete antes de evaluar. [METODOLOGIA][CONFIG]

1. Verifica route lock, actor, fuentes, candidate y efecto.
2. Consume únicamente: component-contract-v1, skill-candidate.
3. Ejecuta el paso S03 → S05 sin asumir permisos.
4. Produce: static-validation-report.
5. Relee hashes, declara gaps y entrega al verifier indicado.

Consulta [references/operating-contract.md](references/operating-contract.md) solo cuando necesites invariantes y recuperación.

## Límite

Cualquier referencia stale, escape, owner o permiso no resoluble bloquea. No instala, publica, conecta ni promueve. RT-09, RT-11 y H01 permanecen actores separados.
