---
name: skill-portfolio-governor
description: This skill should be used when se necesite auditar overlaps, colisiones, huérfanos, deudas, merge, split, demotion o retiro en el portfolio. Coordina los pasos S01, S07 sin ampliar autoridad.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# skill-portfolio-governor

## Operación

Lee [context.md](context.md). Usar inventario para atribuir responsabilidades y emitir Change Proposal, nunca automutación. [METODOLOGIA][CONFIG]

1. Verifica route lock, actor, fuentes, candidate y efecto.
2. Consume únicamente: ecosystem-inventory, skill-eval-run-v1.
3. Ejecuta el paso S01 → S07 sin asumir permisos.
4. Produce: skill-review-report-v1, skill-change-proposal-v1.
5. Relee hashes, declara gaps y entrega al verifier indicado.

Consulta [references/operating-contract.md](references/operating-contract.md) solo cuando necesites invariantes y recuperación.

## Límite

Un overlap no se resuelve silenciosamente y una propuesta no muta el candidate. No instala, publica, conecta ni promueve. RT-09, RT-11 y H01 permanecen actores separados.
