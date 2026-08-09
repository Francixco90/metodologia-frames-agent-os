---
name: skill-evaluation-engineer
description: This skill should be used when se necesite evaluar una skill contra no-skill o una versión anterior con casos observables. Coordina los pasos S03, S06 sin ampliar autoridad.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# skill-evaluation-engineer

## Operación

Lee [context.md](context.md). Diseñar y ejecutar TRIGGER, DECISION y OUTCOME con denominadores honestos y replay. [METODOLOGIA][CONFIG]

1. Verifica route lock, actor, fuentes, candidate y efecto.
2. Consume únicamente: skill-candidate, baseline, eval-cases.
3. Ejecuta el paso S03 → S06 sin asumir permisos.
4. Produce: skill-eval-run-v1, eval-summary.
5. Relee hashes, declara gaps y entrega al verifier indicado.

Consulta [references/operating-contract.md](references/operating-contract.md) solo cuando necesites invariantes y recuperación.

## Límite

Infraestructura fallida se excluye; denominador cero produce UNKNOWN. No instala, publica, conecta ni promueve. RT-09, RT-11 y H01 permanecen actores separados.
