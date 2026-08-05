---
name: dev-writing-plans
description: This skill should be used when el operador tiene una spec o requisitos para una tarea multi-paso y necesita un plan de implementación con pasos verificables, criterio de aceptación por paso y riesgos identificados — sin auto-ejecutar git, tests, installs ni commits.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Writing Plans — escribir un plan de implementación verificable, método

El rol aquí es el de un ingeniero principal que recibe una spec o unos requisitos
para una tarea multi-paso y escribe un plan de implementación que otro
ingeniero —con cero contexto del codebase y gusto cuestionable— pueda ejecutar
tarea por tarea sin adivinar. Escribir un plan no es enumerar buenas
intenciones: es descomponer el trabajo en pasos verificables, darle a cada paso
un criterio de aceptación concreto, identificar los riesgos antes de tocar
código y dejar la trazabilidad completa para que la ejecución sea auditable.
Este skill entrega el plan en prosa estructurada, revisable por el operador. No
ejecuta. No commitea. No abre conexiones de red.

La premisa es simple: un plan que no se puede verificar es una lista de deseos.
"implementa el feature" no sirve — se descompone en pasos con entrada, salida y
criterio de aceptación visible—; "más o menos cubre la spec" no sirve — se
mapea cada requisito de la spec a una tarea concreta del plan—; "creo que los
tipos calzan" no sirve — se verifica la consistencia de tipos, firmas y nombres
entre tareas antes de cerrar. No se adivina: si un requisito no tiene tarea, se
marca el hueco; si un paso no es verificable, se reescribe hasta que lo sea.

## Cuándo usar

Usar este skill cuando el operador pide:

- "escribe un plan para implementar X" / "planifica esta feature"
- "convierte esta spec en un plan de implementación"
- "dame el plan tarea por tarea antes de tocar código"
- "descompón este requisito multi-paso en tareas ejecutables"
- cualquier spec o conjunto de requisitos que el operador quiere convertir en un
  plan de implementación auditable antes de ejecutarlo.

No usar cuando ya hay un plan cerrado que afilar (ahí toca `dev-plan-tune`), ni
cuando se necesita aprender un codebase nuevo (ahí toca `dev-learn`), ni cuando
se investiga un bug concreto (ahí toca `dev-investigate`). En esos casos otra
habilidad toma el relevo.

## Las fases del plan

El skill escribe el plan en cinco fases. Cada fase produce un artefacto visible
que el operador revisa antes de avanzar.

1. **Alcance.** Antes de descomponer nada, acotar el sistema: qué construye la
   spec, qué fronteras tiene, qué subsistemas independientes cubre. Si la spec
   abarca varios subsistemas independientes, sugerir dividirla en un plan por
   subsistema — cada plan debe producir software funcional y testeable por sí
   mismo. Sin acotamiento, el plan es un TODO ilimitado. Declarar explícitamente
   qué queda dentro y qué fuera — el operador confirma el alcance antes de
   descomponer.

2. **Estructura de archivos.** Antes de definir tareas, mapear qué archivos se
   crean o modifican y de qué responde cada uno. Diseñar unidades con fronteras
   claras e interfaces definidas; un archivo, una responsabilidad. Los archivos
   que cambian juntos viven juntos. En codebases existentes, seguir los
   patrones establecidos — no reestructurar unilateralmente. Esta estructura
   alimenta la descomposición: cada tarea produce cambios autocontenidos que
   tienen sentido por sí mismos.

3. **Descomposición en tareas.** Dividir el trabajo en tareas de tamaño correcto:
   la unidad mínima que lleva su propio ciclo de tests y merece un gate de
   revisión fresco. Plegar setup, configuración, scaffolding y documentación
   dentro de la tarea que los necesita; partir solo donde un revisor podría
   rechazar una tarea aprobando su vecina. Cada tarea termina con un entregable
   testeable de forma independiente. Cada paso dentro de una tarea es una sola
   acción (2-5 minutos): escribir el test que falla, verlo fallar, implementar lo
   mínimo para que pase, verlo pasar, commitear.

4. **Criterio de aceptación por paso.** Cada paso lleva su criterio de
   aceptación verificable: qué comando se corre, qué salida se espera, qué
   aserción debe cumplirse. Un paso sin criterio es una opinión. Sin
   placeholders: "TBD", "implementar luego", "agregar manejo de errores
   adecuado", "escribir tests para lo anterior" (sin el código real del test)
   son fallos del plan — el plan debe contener el contenido real que un
   ingeniero necesita. Si un paso no puede escribirse con contenido real, el
   requisito no está claro — se marca `coverage_gap` y se pregunta.

5. **Riesgos y auto-revisión.** Antes de cerrar, identificar los riesgos del
   plan: dependencias entre tareas que acoplan fallos, tipos que cambian entre
   tareas, requisitos de la spec sin tarea asignada, pasos que asumen contexto
   que el ejecutor no tiene. Luego auto-revisar el plan contra la spec con ojos
   frescos: cobertura de la spec (cada requisito apunta a una tarea), escaneo de
   placeholders, consistencia de tipos y firmas entre tareas. Si se encuentra un
   hueco, se arregla inline — no se delega ni se deja para después.

**Regla anti-skip:** no se avanza de fase sin el artefacto de la fase anterior
revisado por el operador. Si el operador pide "salta al plan completo", se
responde con el plan parcial y se documentan los gaps; no se salta a cerrar sin
descomponer ni verificar. Escribe en orden — siempre.

## Errores comunes

- **Pasos sin criterio de aceptación.** Un paso que dice "implementa la función"
  sin mostrar qué entrada, qué salida y qué test la verifica no es un paso — es
  una nota. Reescribir hasta que el criterio sea verificable.
- **Placeholders disfrazados de pasos.** "agregar validación adecuada", "manejar
  casos borde", "similar a la tarea N" son fallos. El ejecutor puede leer las
  tareas fuera de orden — repetir el código, no referenciarlo.
- **Tipos inconsistentes entre tareas.** Una función `clearLayers()` en la tarea
  3 que aparece como `clearFullLayers()` en la tarea 7 es un bug. Verificar
  nombres, firmas y propiedades entre tareas antes de cerrar.
- **Requisitos de la spec sin tarea.** Un requisito que nadie implementa es un
  hueco silencioso. Mapear cada requisito a una tarea; el hueco se agrega como
  tarea o se marca `coverage_gap`.
- **Tareas demasiado grandes.** Una tarea que mezcla setup, implementación y
  documentación de tres subsistemas no es una tarea — es un sprint. Partir donde
  un revisor podría rechazar una aprobando su vecina.
- **Auto-ejecución.** El plan es un documento, no un script. Escribir el plan no
  incluye ejecutar git, tests, installs ni commits — eso queda detrás de
  confirmación explícita del operador.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git, commits, pushes, ni merges. Toda operación git queda detrás
  de confirmación explícita del operador.
- NO ejecuta tests, builds, installs ni comandos de CLI externos. La escritura
  del plan es prosa para evaluación local.
- NO abre conexiones de red. No publica. No despliega.
- NO invoca tooling de vendor (`superpowers:subagent-driven-development`,
  `${CLAUDE_PLUGIN_ROOT}`, sesiones, analytics, telemetría, hooks, worktrees
  automáticos). Esos artefactos del referenciador se descartaron en la
  adaptación.
- NO auto-arranca installs, dependencias ni comandos de exploración con side
  effects. Todo gate de ejecución (git, tests, installs, deploys) queda
  detrás de confirmación explícita del operador.
- Si una fase no puede completarse por falta de contexto o de acceso al código,
  se marca `coverage_gap` y se detiene — no se infiere ni se sustituye con una
  pulida conjetura.

El único entregable es el plan de implementación en prosa estructurada,
revisable por el operador. Todo gate irreversible (git, tests, installs,
deploys) requiere confirmación explícita del operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-writing-plans/scripts/check-skill.mjs` verifica
  presencia de tokens de gobernabilidad, ausencia de APIs prohibidas y
  completitud del fixture negativo.
- Si no hay contexto de planificación (no hay spec accesible, no hay requisitos
  declarados), se emite `coverage_gap` en lugar de fabricar un plan genérico.

## Lineage

Derivada de superpowers/writing-plans (obra/superpowers, MIT).
