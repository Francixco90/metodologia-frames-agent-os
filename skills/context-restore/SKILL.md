---
name: context-restore
description: This skill should be used when the user wants to restore a previously saved conversation context, working state, or session memory to resume a task after a switch, a restart, or a handoff from another agent.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Context Restore — restaurar contexto de trabajo previamente guardado

El rol aqui es el de un ingeniero que recibe las notas de sesion de un colega
para retomar el trabajo exactamente donde lo dejaron. El skill carga el
contexto guardado mas reciente y lo presenta en prosa para que el operador
reanude sin perder un beat. No codigo. No git. No ejecucion automatica.

**Gate duro:** no modifica codigo. Este skill solo lee archivos de contexto
guardados y presenta el resumen. Ninguna operacion destructiva o de escritura
se ejecuta sin confirmacion explicita del operador.

## Cuándo usar

Usar este skill cuando el operador pide:

- "reanudar donde lo deje" / "restaurar contexto"
- "seguir" / "continuar" / "donde estaba"
- retomar una tarea tras un reinicio, un switch de branch o un handoff desde
  otro agente
- cualquier contexto de trabajo previamente guardado que el operador quiere
  recargar sin que el agente ejecute git ni edite codigo por el.

No usar cuando no hay contexto guardado (no hay nada que restaurar — se marca
`coverage_gap`), ni cuando lo que se necesita es guardar el estado actual (ahi
toca el skill de context-save). Tampoco cuando el operador quiere listar
contextos guardados: ese flujo vive en el lado del save.

## Qué restaura

El skill recupera cuatro dimensiones del estado guardado y las presenta en
prosa para que el operador verifique continuidad:

1. **Tarea activa.** El objetivo o titulo del trabajo en curso al momento del
   save. Sin esto, el operador no sabe que estaba haciendo.
2. **Archivos abiertos.** Los archivos que estaban en foco al momento del save,
   para que el operador los reabra sin adivinar. Si un archivo clave se movio o
   se borro desde el save, se declara la deriva.
3. **Decisiones tomadas.** Las decisiones durables registradas (arquitectura,
   scope, tooling, vendor) con su rationale. No se relitigan en silencio: si se
   va a revertir una, se dice explicito y se pide confirmacion.
4. **Pasos pendientes.** El trabajo restante al momento del save, secuenciado,
   para que el operador sepa por donde seguir. El primer item pendiente es el
   candidato natural para continuar.

## Cómo cargar el contexto guardado

- Buscar los archivos de contexto guardados en el directorio del proyecto.
  Por defecto, cargar el mas reciente por prefijo de timestamp en el nombre
  de archivo (`YYYYMMDD-HHMMSS`), no por mtime del filesystem — los nombres
  son estables a traves de copias y rsync; el mtime deriva y no es autoritativo.
- No filtrar por branch. El contexto guardado en un branch puede reanudarse
  desde otro — el cross-branch resume es el punto entero de este skill. Solo
  se filtra por branch si el operador pide explicitamente un fragmento de
  titulo que resulta ser branch-specific.
- Si el operador especifica un fragmento de titulo o numero, cargar ese
  archivo especifico en lugar del mas reciente.
- Leer el archivo elegido y presentar el resumen estructurado: titulo, branch,
  timestamp guardado, duracion de la ultima sesion (si esta disponible),
  estado, resumen, trabajo restante y notas.

## Cómo verificar continuidad

- Si el branch actual difiere del branch del contexto guardado, senalarlo: "Este
  contexto se guardo en el branch `{branch}`. Estas en `{current branch}`.
  Puede que quieras cambiar de branch antes de continuar."
- Si no hay contextos guardados, emitir `coverage_gap` y decirle al operador
  que guarde primero con el skill de save — no se fabrica un resumen generico.
- Despues de presentar, ofrecer next steps: continuar con el primer item
  pendiente, mostrar el archivo completo, o cerrar. La decision queda en el
  operador.
- No ejecutar git, no editar codigo, no abrir red, no invocar tooling de vendor.
  Todo gate de ejecucion queda detras de confirmacion explicita del operador.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO modifica codigo. Solo lee archivos guardados y presenta el resumen.
- NO ejecuta git, commits, pushes, checkouts, restores ni merges.
- NO abre conexiones de red. No publica. No despliega.
- NO invoca tooling de vendor (`npx gstack`, `~/.gstack/sessions`, hooks,
  telemetria, analytics). Esos artefactos del referenciador se descartaron en
  la adaptacion.
- Si no hay contexto guardado, o falta una dimension (no hay tarea, no hay
  archivos, no hay decisiones, no hay pasos pendientes), se marca
  `coverage_gap` y se detiene — no se infiere ni se sustituye con una conjetura
  pulida. Una ausencia no se sustituye por una inferencia.

El unico entregable es el resumen de contexto en prosa, revisable por el
operador.

## Validación

- El checker local `skills/context-restore/scripts/check-skill.mjs` verifica
  presencia de tokens de gobernabilidad, ausencia de APIs prohibidas, campos
  de frontmatter y LINEAGE, y completitud de los fixtures.
- Si no hay contexto guardado, se emite `coverage_gap` en lugar de fabricar un
  resumen generico.

Derivada de context-restore (garrytan/gstack, MIT).
