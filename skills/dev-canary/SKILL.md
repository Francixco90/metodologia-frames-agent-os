---
name: dev-canary
description: This skill should be used when el operador pide planear un despliegue canary / rollout progresivo — definir línea base, exposición incremental, observabilidad, umbrales de alerta, gates de rollback y criterios de veredicto — dejando el plan en prosa, sin auto-ejecutar git, deploys ni commits.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Canary — planear un despliegue canary / rollout progresivo

Derivada de canary (garrytan/gstack, MIT).

El rol aquí es el de un ingeniero de confiabilidad que recibe la intención de
desplegar y diseña el plan canary antes de que exista exposición. Un canary no
es "despliegue y reza": es exposición incremental, línea base comparativa,
observabilidad de cambios, tolerancia a transitorios y gates explícitos de
rollback. Este skill interroga la intención dimensión por dimensión hasta que
queda un plan tight — sin huecos, sin umbrales adivinados, sin gates
implícitos. El entregable es el plan en prosa, listo para que el operador
decida ejecutarlo. No deploy. No git. No ejecución automática.

La premisa es simple: un canary sin plan se rompe en producción. "monitorea
un rato" no sirve — se declara la cadencia y qué se mide—; "si algo falla,
revierte" no sirve — se declara qué dispara rollback, qué severidad, quién
confirma—; "varias páginas" no sirve — se lista el conjunto exacto. No se
adivina: si no se sabe algo del rollout, se dice y se pregunta, o se lee el
contexto primero.

## Cuándo usar

Usar este skill cuando el operador pide:

- "planifica un canary" / "diseña el rollout progresivo"
- "define la estrategia canary antes de desplegar"
- "plan de exposición incremental para este deploy"
- "canary check" / "post-deploy monitoring plan"
- cualquier despliegue donde el operador quiere exposición progresiva con
  red de rollback antes de arrancar la implementación.

No usar cuando el deploy ya ocurrió y lo que se necesita es monitoreo en
vivo (ahí toca ejecución, no planificación), ni cuando se quiere un
despliegue big-bang sin canary. En esos casos otra habilidad toma el relevo.

## Las dimensiones del plan canary

El skill planifica el canary a lo largo de seis dimensiones. Cada dimensión
produce un artefacto visible que el operador revisa antes de avanzar.

1. **Línea base.** Antes de cualquier exposición canary, definir qué se mide
   y cómo. La línea base es la referencia contra la que se comparan los
   chequeos: screenshots, conteo de errores de consola, tiempo de carga,
   contenido textual. Para cada página/ruta a monitorear, declarar: qué
   métrica se captura, dónde se guarda la línea base, cuándo se toma (antes
   del deploy, siempre). Sin línea base, canary es un health check sin
   comparación — se marca `coverage_gap` y no se avanza.

2. **Exposición incremental.** El canary no expone todo de una vez. Definir
   los incrementos de tráfico, páginas o duración: 1% → 5% → 25% → 50% →
   100%, o por páginas, o por ventanas de tiempo. Para cada incremento,
   declarar: cuánto dura, qué se verifica antes de avanzar al siguiente, qué
   gate detiene o revierte. Un canary sin incrementos declarados es un
   big-bang disfrazado de progresivo.

3. **Observabilidad.** Qué se monitorea en cada chequeo: errores de consola
   nuevos, regresión de performance (umbral relativo a la línea base, no
   absoluto), links rotos, fallos de página. Definir la cadencia de chequeo
   (cada 60s es típico, pero se declara explícito). Alertar sobre cambios,
   no absolutos — una página con 3 errores en la línea base sigue sana si
   sigue con 3. Un error nuevo es la alerta. Sin métricas declaradas, no hay
   canary, hay esperanza.

4. **Umbrales de alerta y tolerancia a transitorios.** Definir la severidad:
   CRITICAL (fallo de página, timeout), HIGH (errores nuevos), MEDIUM
   (regresión 2x la línea base), LOW (404 nuevos). Tolerancia a transitorios:
   alertar solo en patrones que persisten 2+ chequeos consecutivos. Un blip
   único de red no es alerta. No se clama al lobo. Para cada severidad,
   declarar el gate de confirmación del operador antes de actuar — el skill
   planifica, el operador decide.

5. **Gates de rollback.** Para cada severidad de alerta, declarar la
   respuesta: CRITICAL → rollback inmediato (previa confirmación), HIGH →
   investigar o rollback, MEDIUM → continuar monitoreo, LOW → continuar. El
   rollback es decisión del operador — el skill planifica el gate, no lo
   ejecuta. Declarar qué dispara rollback, quién confirma, qué se reverte,
   cómo se vuelve a la línea base. Un canary sin gate de rollback es un
   deploy sin red.

6. **Veredicto y reporte de salud.** Al cerrar el monitoreo, producir un
   veredicto: HEALTHY / DEGRADED / BROKEN. Reporte por página: estado,
   errores, load promedio. Guardar screenshots como evidencia — cada alerta
   lleva screenshot, sin excepciones. El veredicto es observación, no
   aprobación automática — el operador decide si la línea base se actualiza
   o si se revierte. `RENDERED_DRAFT != FINAL != HUMAN_APPROVED`.

**Regla anti-skip:** no se inicia deploy canary sin un plan aprobado por el
operador. Si el operador pide "despliega ya", se responde con el plan
primero; si lo rechaza, se documenta la decisión y se marca `coverage_gap`
en lugar de exponer a ciegas. Planifica antes de exponer — siempre.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git, commits, pushes, ni merges. Toda operación git queda
  detrás de confirmación explícita del operador.
- NO ejecuta deploys, builds, ni comandos de CLI externos. La orientación es
  prosa para evaluación local.
- NO abre conexiones de red. No despliega. No expone tráfico. No invoca
  browse daemons ni tooling de monitoreo en vivo.
- NO invoca tooling de vendor (`npx gstack`, `${CLAUDE_SKILL_DIR}`,
  sesiones, analytics, telemetría, hooks, mockups). Esos artefactos del
  referenciador se descartaron en la adaptación.
- NO auto-arranca el deploy canary ni el monitoreo. Todo gate de ejecución
  (git, deploys, commits, exposure) queda detrás de confirmación explícita
  del operador.
- Si una dimensión no puede completarse por falta de contexto, se marca
  `coverage_gap` y se detiene — no se infiere ni se sustituye con una
  pulida conjetura.

El único entregable es el plan canary en prosa, revisable por el operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-canary/scripts/check-skill.mjs` verifica
  presencia de tokens de gobernabilidad, ausencia de APIs prohibidas y
  completitud del fixture negativo.
- Si no hay contexto de deploy (no hay objetivo claro, no hay líneas base
  posibles), se emite `coverage_gap` en lugar de fabricar un plan canary
  genérico.
