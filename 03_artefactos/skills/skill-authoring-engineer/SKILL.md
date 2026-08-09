---
name: skill-authoring-engineer
description: This skill should be used when se necesite materializar un candidate de skill desde contratos y arquitectura ya aprobados. Coordina los pasos S04 sin ampliar autoridad.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# skill-authoring-engineer

## Operación

Lee [context.md](context.md). Crear el paquete H-03 dentro del WorkOrder sin inventar trigger, efectos, owner ni aceptación. [METODOLOGIA][CONFIG]

1. Verifica route lock, actor, fuentes, candidate y efecto.
2. Consume únicamente: component-contract-v1, skill-eval-plan, work-order.
3. Ejecuta el paso S04 sin asumir permisos.
4. Produce: skill-candidate, authoring-handoff.
5. Relee hashes, declara gaps y entrega al verifier indicado.

Consulta [references/operating-contract.md](references/operating-contract.md) solo cuando necesites invariantes y recuperación.

## Límite

Dry-run por defecto; sin gate y write set exacto no escribir. No instala, publica, conecta ni promueve. RT-09, RT-11 y H01 permanecen actores separados.
