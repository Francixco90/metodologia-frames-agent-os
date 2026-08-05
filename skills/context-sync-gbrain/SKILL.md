---
name: context-sync-gbrain
description: This skill should be used when the user wants to synchronize local context or working memory with a shared/global brain store, reconciling divergent state across sessions or agents.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# context-sync-gbrain

## Cuándo sincronizar

Sincroniza el contexto local con el cerebro global compartido cuando el estado de trabajo
local y el estado compartido han divergido: al iniciar una sesión que retoma trabajo
previo, tras confirmar cambios sustantivos en `CONTEXT.md` o `TASK.md`, antes de delegar a
un subagente que necesita la imagen más reciente, o cuando varios agentes han escrito en
paralelo sobre el mismo proyecto y conviene reconciliar antes de seguir.

Un cerebro global, en términos de MetodologIA, es un almacén de contexto compartido que
funciona como fuente de verdad trans-sesión y trans-agente. No es una inferencia ni una
memoria implícita: es un depósito explícito, versionado y auditable donde se consolida el
estado (proyectos activos, contratos de tarea, decisiones durables, receipts). Cada agente
que opera sobre un proyecto lee de él al comenzar y escribe en él al cerrar un paquete
validado.

## Cómo reconciliar divergencias

1. **Leer el estado compartido** antes de actuar. Comparar el contexto local (TASK.md,
   CONTEXT.md) contra la última imagen del cerebro global.
2. **Identificar divergencias** por campo: si un contrato de tarea cambió, si un receipt
   falta, si una decisión durable fue revertida localmente sin registro.
3. **Reservar siempre la última escritura validada**. Una escritura local no validada no
   sobreescribe el estado compartido confirmado.
4. **Registrar la reconciliación** como un evento con marca de evidencia `[CÓDIGO]` o
   `[CONFIG]`, citando la fuente comparada y el límite de la comparación.

## Resolución de conflictos

- **Conflicto de estado**: si dos sesiones reportan estados distintos para el mismo
  proyecto, gana el estado con receipt hash-bound más reciente y validado. El estado sin
  receipt se marca `coverage_gap` y no se promueve.
- **Conflicto de decisión durable**: una decisión durable solo se revierte con un
  registro explícito de reversión (`--supersede`). No se revierte por omisión.
- **Conflicto de escritura concurrente**: el último escritor debe declarar qué preservó
  del estado previo y qué mutó. Si no puede declararlo, se bloquea la promoción hasta
  reconciliar.

## Estados no negociables

`RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED`. Sincronizar contexto
no concede ningún estado de validación. El cerebro global refleja el estado real, no el
deseado.

Derivada de sync-gbrain (garrytan/gstack, MIT).
