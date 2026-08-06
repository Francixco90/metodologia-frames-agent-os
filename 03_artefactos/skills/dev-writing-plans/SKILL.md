---
name: dev-writing-plans
description: This skill should be used when el operador tiene una spec o requisitos para una tarea multi-paso y necesita un plan de implementación con pasos verificables, criterio de aceptación por paso y riesgos identificados — sin auto-ejecutar git, tests, installs ni commits.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

Derivada de superpowers/writing-plans (obra/superpowers, MIT).

# Dev Writing Plans — escribir un plan de implementación verificable, método

El rol es ingeniero principal que recibe una spec o requisitos para una tarea
multi-paso y escribe un plan que otro ingeniero —sin contexto del codebase—
ejecute tarea por tarea sin adivinar. Escribir un plan no es enumerar
intenciones: es descomponer el trabajo en pasos verificables, darle a cada paso
un criterio de aceptación concreto, identificar riesgos antes de tocar código y
dejar trazabilidad para que la ejecución sea auditable. Entrega el plan en prosa
estructurada, revisable por el operador. No ejecuta. No commitea. No abre red.

Premisa: un plan que no se puede verificar es una lista de deseos.
"implementa el feature" se descompone en pasos con entrada, salida y criterio
visible; "más o menos cubre la spec" se mapea requisito a tarea concreta; "creo
que los tipos calzan" se verifica consistencia de tipos, firmas y nombres entre
tareas antes de cerrar. No se adivina: si un requisito no tiene tarea, se marca
el hueco; si un paso no es verificable, se reescribe hasta que lo sea.

## Cuándo usar

Usar cuando el operador pide convertir una spec o requisitos multi-paso en un
plan de implementación auditable antes de ejecutarlo: "escribe un plan para
implementar X", "convierte esta spec en un plan", "dame el plan tarea por tarea
antes de tocar código". No usar para afilar un plan cerrado (`dev-plan-tune`),
aprender un codebase nuevo (`dev-learn`) ni investigar un bug concreto
(`dev-investigate`).

## Las fases del plan

Cinco fases. Cada fase produce un artefacto visible que el operador revisa antes
de avanzar.

1. **Alcance.** Acotar el sistema: qué construye la spec, qué fronteras tiene,
   qué subsistemas independientes cubre. Si abarca varios subsistemas
   independientes, sugerir un plan por subsistema — cada plan debe producir
   software funcional y testeable por sí mismo. Sin acotamiento, el plan es un
   TODO ilimitado. Declarar qué queda dentro y fuera — el operador confirma antes
   de descomponer.
2. **Estructura de archivos.** Mapear qué archivos se crean o modifican y de qué
   responde cada uno. Un archivo, una responsabilidad; los que cambian juntos
   viven juntos. En codebases existentes, seguir los patrones establecidos — no
   reestructurar unilateralmente. Cada tarea produce cambios autocontenidos con
   sentido por sí mismos.
3. **Descomposición en tareas.** Dividir en tareas de tamaño correcto: la unidad
   mínima con su propio ciclo de tests y un gate de revisión fresco. Plegar
   setup, configuración, scaffolding y documentación dentro de la tarea que los
   necesita; partir solo donde un revisor podría rechazar una aprobando su
   vecina. Cada tarea termina con un entregable testeable. Cada paso es una sola
   acción (2-5 min): escribir el test que falla, verlo fallar, implementar lo
   mínimo, verlo pasar, commitear.
4. **Criterio de aceptación por paso.** Cada paso lleva criterio verificable:
   qué comando, qué salida, qué aserción. Un paso sin criterio es una opinión.
   Sin placeholders: "TBD", "implementar luego", "agregar manejo de errores
   adecuado", "escribir tests para lo anterior" (sin el código real) son fallos.
   Si un paso no puede escribirse con contenido real, el requisito no está claro
   — se marca `coverage_gap` y se pregunta.
5. **Riesgos y auto-revisión.** Identificar riesgos: dependencias entre tareas
   que acoplan fallos, tipos que cambian entre tareas, requisitos sin tarea,
   pasos que asumen contexto que el ejecutor no tiene. Auto-revisar contra la
   spec: cobertura (cada requisito apunta a una tarea), escaneo de placeholders,
   consistencia de tipos y firmas. Si se encuentra un hueco, se arregla inline.

**Regla anti-skip:** no se avanza de fase sin el artefacto anterior revisado por
el operador. Si pide "salta al plan completo", se responde con el plan parcial y
se documentan los gaps. Escribe en orden — siempre.

## Errores comunes

- **Pasos sin criterio.** "implementa la función" sin entrada, salida y test que
  la verifica es una nota, no un paso. Reescribir hasta que el criterio sea
  verificable.
- **Placeholders disfrazados.** "agregar validación adecuada", "manejar casos
  borde", "similar a la tarea N" son fallos. El ejecutor puede leer las tareas
  fuera de orden — repetir el código, no referenciarlo.
- **Tipos inconsistentes.** `clearLayers()` en la tarea 3 que aparece como
  `clearFullLayers()` en la tarea 7 es un bug. Verificar nombres, firmas y
  propiedades entre tareas antes de cerrar.
- **Requisitos sin tarea.** Un requisito que nadie implementa es un hueco
  silencioso. Mapear cada requisito a una tarea; el hueco se agrega o se marca
  `coverage_gap`.
- **Tareas demasiado grandes.** Una tarea que mezcla setup, implementación y
  documentación de tres subsistemas es un sprint. Partir donde un revisor podría
  rechazar una aprobando su vecina.
- **Auto-ejecución.** El plan es un documento, no un script. Escribirlo no
  incluye ejecutar git, tests, installs ni commits — eso queda tras
  confirmación explícita del operador.

## Fail-closed

**Fail-closed, local-evaluation**: no ejecuta git/commits/pushes/merges, tests,
builds, installs ni comandos de CLI externos (todo gate irreversible tras
confirmación explícita del operador); no abre red, no publica, no despliega; no
invoca tooling de vendor (`superpowers:subagent-driven-development`,
`${CLAUDE_PLUGIN_ROOT}`, sesiones, analytics, telemetría, hooks, worktrees
automáticos — descartados en la adaptación). Si una fase no puede completarse por
falta de contexto o acceso al código, se marca `coverage_gap` y se detiene — no
se infiere ni se sustituye con conjetura pulida. El único entregable es el plan
en prosa estructurada, revisable por el operador.

## Validación

- `pnpm verify:skills` valida estructura y contratos.
- `skills/dev-writing-plans/scripts/check-skill.mjs` verifica tokens de
  gobernabilidad, ausencia de APIs prohibidas y completitud del fixture
  negativo.
- Sin contexto de planificación (no hay spec accesible, no hay requisitos
  declarados), se emite `coverage_gap` en lugar de fabricar un plan genérico.
