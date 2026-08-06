---
name: dev-subagent-driven-development
description: This skill should be used when el operador quiere ejecutar un plan de implementación descomponiéndolo en tareas independientes y delegando cada una a un subagente con contexto aislado, revisando la salida de cada subagente contra la spec y la calidad antes de avanzar — sin auto-despachar subagentes que mutan ni commits sin confirmación explícita del operador.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Subagent-Driven Development — delegar, descomponer, revisar, método

El rol aquí es el de un ingeniero principal que coordina la ejecución de un
plan de implementación delegando cada tarea a un subagente fresco con contexto
aislado. El controlador no implementa: descompone, despacha, revisa y
adjudica. La premisa es simple — un subagente con contexto aislado y
precisamente construido se concentra en su tarea y no hereda el ruido de la
sesión; el controlador preserva su propio contexto para coordinación. Pero
delegar no es abandonar: toda salida de un subagente se revisa contra la spec
y la calidad antes de avanzar, y todo despacho que muta el repositorio
(commits, installs, deploys) queda detrás de confirmación explícita del
operador. Este skill es **fail-closed** y de **local-evaluation**: no
auto-despacha subagentes que mutan, no ejecuta git, no publica, no despliega.

La diferencia con ejecutar el plan a mano es el aislamiento de contexto. La
diferencia con despachar y olvidar es el gate de revisión por tarea. "Ya lo
despachué" no sirve — se revisa la salida; "más o menos cumple la spec" no
sirve — se verifica compliance o entra al loop de fixes; "confío en el
subagente" no sirve — el controlador adjudica solo con evidencia. No se
adivina: si el subagente reporta BLOCKED, se cambia algo (contexto, modelo,
descomposición) antes de re-despachar.

## Cuándo usar

Usar este skill cuando el operador pide:

- "ejecuta este plan delegando a subagentes" / "divide este plan y despacha"
- "implementa estas tareas con subagent-driven development"
- "coordina la ejecución del plan revisando cada tarea"
- cualquier plan de implementación con tareas mayormente independientes que el
  operador quiere ejecutar por delegación con revisión por tarea.

No usar cuando las tareas están fuertemente acopladas y no se pueden aislar
(ahí toca ejecución manual), ni cuando no hay plan cerrado (ahí toca
brainstorm o `dev-plan-tune` primero), ni para investigar un bug concreto (ahí
toca `dev-investigate`). En esos casos otra habilidad toma el relevo.

## Cuándo delegar y cuándo NO delegar

Delegar vale la pena cuando hay un plan cerrado con tareas mayormente
independientes, cada tarea se aísla con su propio contexto, el controlador
necesita preservar su contexto para coordinación, y la revisión por tarea
(spec + calidad) es posible y útil.

NO delegar cuando las tareas están tan acopladas que el overhead de handoff
supera al beneficio del aislamiento, no hay plan (despachar sin descomposición
es churn no verificado), una tarea requiere juicio arquitectónico que vive en
el controlador y no se transfiere limpiamente, o el costo de revisar la salida
supera al costo de hacerla a mano.

La regla: delegar es una herramienta de aislamiento de contexto, no un
mandato. Si una tarea no se aísla limpiamente, se ejecuta en el controlador y
se documenta.

## Receta — router

Full cinco fases de la delegación (descomponer, despachar, recibir reporte,
revisar, adjudicar) + handoff de contexto + selección de modelo + riesgos
lives in `references/sdd-receta.md` (governed, hash-bound). Load the receta
antes de despachar.

| Bloque receta               | Where                                     | Notas                                                                       |
| --------------------------- | ----------------------------------------- | --------------------------------------------------------------------------- |
| 5 fases de la delegación    | `references/sdd-receta.md` § Las fases    | Descomponer→Despachar→Recibir reporte→Revisar→Adjudicar. Regla anti-skip    |
| Handoff de contexto         | `references/sdd-receta.md` § Handoff      | Artefactos como archivos no prosa; ledger = mapa de recuperación post-compaction |
| Selección de modelo         | `references/sdd-receta.md` § Selección    | Modelo menos potente que maneje el rol; turnos le ganan al precio por token |
| Riesgos                     | `references/sdd-receta.md` § Riesgos      | Re-dispatch, context pollution, pre-juzgar, adjudicar antes del tope, paralelo |

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO auto-despacha subagentes que mutan el repositorio. Todo despacho de
  implementación que ejecuta commits, installs, tests, builds o deploys queda
  detrás de confirmación explícita del operador.
- NO ejecuta git, commits, pushes ni merges en el controlador. Toda
  operación git tras confirmación.
- NO abre conexiones de red. No publica. No despliega.
- NO invoca tooling de vendor (`scripts/sdd-workspace`, `task-brief`,
  `review-package`, hooks, analytics, telemetría). Esos artefactos del
  referenciador se descartaron en la adaptación.
- NO auto-arranca installs, dependencias ni comandos con side effects. Todo
  gate de ejecución tras confirmación explícita del operador.
- Si una tarea no puede completarse por falta de contexto o de acceso al
  código, se marca `coverage_gap` y se detiene — no se infiere ni se
  sustituye con una conjetura pulida.

El único entregable es el plan ejecutado con revisión por tarea, revisable
por el operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-subagent-driven-development/scripts/check-skill.mjs`
  verifica presencia de tokens de gobernabilidad, ausencia de APIs
  prohibidas y completitud del fixture negativo.
- Si no hay plan cerrado, no hay write-set o no hay tareas aislables, se
  emite `coverage_gap` en lugar de fabricar un plan de despacho genérico.

Derivada de superpowers/subagent-driven-development (obra/superpowers, MIT).