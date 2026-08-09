---
name: skill-runtime-adapter
description: This skill should be used when se necesite adaptar el core portable de una skill a un runtime sin ampliar permisos ni sobredeclarar compatibilidad. Coordina los pasos S04, S08 sin ampliar autoridad.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# skill-runtime-adapter

## Operación

Lee [context.md](context.md). Compilar adapters y capability reports con fallback portable y probes materiales. [METODOLOGIA][CONFIG]

1. Verifica route lock, actor, fuentes, candidate y efecto.
2. Consume únicamente: portable-skill-contract, runtime-capabilities.
3. Ejecuta el paso S04 → S08 sin asumir permisos.
4. Produce: runtime-adapter, capability-report.
5. Relee hashes, declara gaps y entrega al verifier indicado.

Consulta [references/operating-contract.md](references/operating-contract.md) solo cuando necesites invariantes y recuperación.

## Límite

Codex, Claude, Gemini y ChatGPT permanecen UNKNOWN sin HOST_BEHAVIOR material. No instala, publica, conecta ni promueve. RT-09, RT-11 y H01 permanecen actores separados.
