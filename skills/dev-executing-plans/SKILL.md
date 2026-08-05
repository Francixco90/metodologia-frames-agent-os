---
name: dev-executing-plans
description: This skill should be used when el operador tiene un plan de implementación escrito y debe ejecutarlo paso a paso en una sesión con checkpoints de revisión tras cada paso, gestionando bloqueadores y escalando en lugar de adivinar — sin auto-ejecutar commits, deploys ni operaciones irreversibles sin confirmación explícita del operador.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Executing Plans — ejecutar un plan escrito, paso a paso, con checkpoints

El rol aquí es el de un ingeniero que recibe un plan de implementación ya escrito
y lo ejecuta en orden, un paso a la vez, con un checkpoint de revisión tras cada
paso. Ejecutar un plan no es volcarse sobre el teclado: es cargar el plan,
revisarlo críticamente, ejecutar cada tarea siguiendo sus pasos exactos, correr
las verificaciones que el plan pida y reportar al terminar — deteniéndose en el
primer bloqueador en lugar de forzar la marcha. Este skill recorre el plan en
fases y entrega un reporte de ejecución en prosa, revisable por el operador. No
auto-ejecuta commits ni deploys. No publicaciones. No operaciones irreversibles
sin confirmación explícita.

La premisa es simple: un plan que se ejecuta sin checkpoints se descontrola. "Ya
hice el paso" no sirve — se marca el paso en progreso, se sigue cada subpaso
exacto, se corren las verificaciones y se marca completado solo con evidencia—;
"me trabé, sigo igual" no sirve — se detiene la ejecución y se escala el
bloqueador en lugar de adivinar—; "creo que el plan dice X" no sirve — se sigue
el plan como está escrito y, si una instrucción no se entiende, se pregunta. No
se adivina: si no se sabe algo, se dice y se escala, o se lee el contexto
primero.

## Cuándo usar

Usar este skill cuando el operador pide:

- "ejecuta este plan" / "implementa este plan"
- "sigue el plan paso a paso" / "recorre este plan con checkpoints"
- "implementa estas tareas en orden" + un plan escrito ya existe
- "ejecuta el plan de la sesión anterior" + plan accesible
- cualquier plan de implementación escrito que el operador quiere ejecutar de
  forma metódica con revisión tras cada paso.

No usar cuando se necesita aprender un codebase nuevo (ahí toca `dev-learn`),
ni cuando se debe investigar un bug concreto (ahí toca `dev-investigate`), ni
cuando se debe afilar un plan existente (ahí toca `dev-plan-tune`). En esos
casos otra habilidad toma el relevo.

## Las fases de la ejecución

El skill ejecuta el plan en cuatro fases. Cada fase produce un artefacto visible
que el operador revisa antes de avanzar.

1. **Cargar y revisar el plan.** Antes de ejecutar, leer el plan completo y
   revisarlo críticamente: ¿hay pasos ambiguos? ¿Faltan dependencias? ¿Las
   verificaciones están declaradas? ¿Hay pasos irreversibles (commits, deploys,
   publicaciones) que requieren confirmación explícita? Si hay preocupaciones,
   plantearlas al operador antes de empezar. Si no las hay, crear las tareas
   derivadas del plan y proceder. Sin revisión crítica, la ejecución arranca a
   ciegas — un plan con huecos se ejecuta mal.

2. **Ejecutar cada paso.** Para cada tarea del plan: marcarla en progreso, seguir
   cada subpaso exactamente como está escrito, correr las verificaciones que el
   plan especifique y marcarla completada solo con evidencia. Un paso no se
   salta, no se reordena, no se mejora — se sigue. Si el plan dice "ejecuta X",
   se ejecuta X; si el plan dice "verifica Y", se verifica Y. La fidelidad al
   plan es el contrato.

3. **Checkpoint tras cada paso.** Tras completar cada paso, detenerse y dejar
   el artefacto visible para que el operador lo revise: qué se hizo, qué se
   verificó, qué quedó pendiente. No se avanza al siguiente paso sin el
   checkpoint del operador. El checkpoint no es opcional — es el gate que
   separa "ejecuté" de "sigo". Si el operador pide "salta al final", se entrega
   el estado parcial y se documentan los gaps; no se salta a concluir sin
   ejecutar ni verificar.

4. **Cerrar la ejecución.** Cuando todas las tareas están completas y
   verificadas, se reporta: qué se ejecutó, qué verificaciones pasaron, qué
   riesgos o gaps quedan. Las operaciones irreversibles — commits, pushes,
   merges, deploys, publicaciones — quedan detrás de confirmación explícita
   del operador. El skill no las auto-ejecuta. Un reporte de ejecución no es
   un merge aprobado — la confirmación del operador es el gate que falta.

**Regla anti-skip:** no se avanza de paso sin el checkpoint del operador. Si
el operador pide "sigue sin parar", se responde con el estado parcial y se
documentan los pasos pendientes; no se ejecutan a ciegas. Ejecuta en orden —
siempre.

## Cuándo detenerse y escalar

Detener la ejecución inmediatamente cuando:

- Se golpea un bloqueador: dependencia faltante, verificación que falla,
  instrucción que no se entiende.
- El plan tiene un hueco crítico que impide continuar.
- Una verificación falla de forma repetida sin causa clara.
- Aparece una operación irreversible no declarada en el plan.

Ante un bloqueador, escalar en lugar de adivinar: plantear el problema al
operador, declarar qué se hizo hasta el punto del bloqueo, qué se intentó y
qué contexto falta. No se fuerza la marcha a través de un bloqueador — se
detiene y se pregunta. Si el operador actualiza el plan en respuesta a un
bloqueador, se vuelve a la fase de revisión (fase 1) antes de reanudar.

## Errores comunes

- **Saltar checkpoints.** Ejecutar varios pasos seguidos sin detenerse a
  revisar con el operador. Rompe la regla anti-skip y descontrola la ejecución.
- **Adivinar ante un bloqueador.** Interpretar "me trabé" como permiso para
  inventar el siguiente paso. Se detiene y se escala, siempre.
- **Auto-ejecutar operaciones irreversibles.** Commits, pushes, merges, deploys
  o publicaciones sin confirmación explícita del operador. Rompe el modo
  fail-closed.
- **Mejorar el plan sobre la marcha.** Reescribir pasos, reordenar tareas o
  añadir alcance no pedido. La fidelidad al plan es el contrato; si el plan
  necesita cambios, se escala, no se improvisa.
- **Marcar completado sin verificación.** Cerrar un paso sin correr la
  verificación que el plan pide. Un paso sin verificación es una suposición,
  no un paso completado.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git, commits, pushes ni merges. Toda operación git queda detrás
  de confirmación explícita del operador.
- NO ejecuta deploys, publicaciones ni operaciones irreversibles. Todo gate de
  ejecución irreversible queda detrás de confirmación explícita del operador.
- NO abre conexiones de red. No publica. No despliega.
- NO invoca tooling de vendor (`superpowers`, sub-skills de vendor, sesiones,
  analytics, telemetría, hooks). Esos artefactos del referenciador se
  descartaron en la adaptación.
- NO auto-arranca installs, dependencias ni comandos de exploración con side
  effects. Todo gate de ejecución queda detrás de confirmación explícita del
  operador.
- Si un paso no puede completarse por falta de contexto o por un bloqueador, se
  marca `coverage_gap` y se detiene — no se infiere ni se sustituye con una
  pulida conjetura.

El único entregable es el reporte de ejecución en prosa, revisable por el
operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-executing-plans/scripts/check-skill.mjs`
  verifica presencia de tokens de gobernabilidad, ausencia de APIs prohibidas
  y completitud del fixture negativo.
- Si no hay plan accesible (no hay archivo de plan, no hay pasos declarados),
  se emite `coverage_gap` en lugar de fabricar una ejecución genérica.

Derivada de superpowers/executing-plans (obra/superpowers, MIT).
