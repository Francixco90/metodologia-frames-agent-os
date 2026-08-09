---
name: skill-system-architect
description: This skill should be used when se necesite diseñar, crear, dividir, fusionar, degradar o retirar una skill o un sistema de skills. Coordina los pasos S00, S01, S02 sin ampliar autoridad.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# skill-system-architect

## Operación

Lee [context.md](context.md). Producir Skill Case, demotion test, Capability Map y Architecture Decision. [METODOLOGIA][CONFIG]

1. Verifica route lock, actor, fuentes, candidate y efecto.
2. Consume únicamente: request, evidence, ecosystem-inventory.
3. Ejecuta el paso S00 → S01 → S02 sin asumir permisos.
4. Produce: skill-system-case-v1, capability-map-v1, architecture-decision-v1.
5. Relee hashes, declara gaps y entrega al verifier indicado.

Consulta [references/operating-contract.md](references/operating-contract.md) solo cuando necesites invariantes y recuperación.

## Límite

No diseñar una skill si una instrucción, referencia o tool satisface la aceptación. No instala, publica, conecta ni promueve. RT-09, RT-11 y H01 permanecen actores separados.
