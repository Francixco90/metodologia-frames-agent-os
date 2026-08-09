---
name: skill-expert-distiller
description: This skill should be used when se necesite convertir práctica experta en reglas, defaults, excepciones, límites y oráculos evaluables. Coordina los pasos S00, S03 sin ampliar autoridad.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# skill-expert-distiller

## Operación

Lee [context.md](context.md). Separar evidencia, preferencia, heurística y autoridad antes de incorporarlas a una skill. [METODOLOGIA][CONFIG]

1. Verifica route lock, actor, fuentes, candidate y efecto.
2. Consume únicamente: expert-material, source-refs.
3. Ejecuta el paso S00 → S03 sin asumir permisos.
4. Produce: expert-knowledge-map, eval-oracles.
5. Relee hashes, declara gaps y entrega al verifier indicado.

Consulta [references/operating-contract.md](references/operating-contract.md) solo cuando necesites invariantes y recuperación.

## Límite

Una preferencia no se convierte en regla universal sin evidencia repetida. No instala, publica, conecta ni promueve. RT-09, RT-11 y H01 permanecen actores separados.
