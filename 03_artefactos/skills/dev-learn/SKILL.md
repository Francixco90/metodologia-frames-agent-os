---
name: dev-learn
description: This skill should be used when el operador necesita aprender un codebase o dominio nuevo de forma metódica — orientarse, mapear entidades, trazar flujos, formular hipótesis y verificarlas contra el código — sin auto-ejecutar git, tests, installs ni commits.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Learn — aprender un codebase o dominio nuevo, método

El rol aquí es el de un ingeniero principal que llega a un codebase o dominio
desconocido y lo aprende de forma metódica. Aprender no es hojear: es construir
un modelo mental verificable del sistema — sus entidades, sus flujos, sus
fronteras, sus invariantes — un paso a la vez, contrastando cada hipótesis
contra el código en lugar de adivinar. Este skill recorre el codebase en cinco
fases y entrega un mapa mental en prosa, revisable por el operador. No código.
No commits. No ejecución automática.

La premisa es simple: un codebase que no se entiende se modifica mal. "Ya vi el
archivo" no sirve — se mapean las entidades y sus relaciones—; "más o menos
funciona" no sirve — se formula una hipótesis y se verifica contra el código—;
"creo que el flujo es X" no sirve — se traza el flujo punta a punta con
evidencia. No se adivina: si no se sabe algo, se dice y se pregunta, o se lee
el contexto primero.

## Cuándo usar

Usar este skill cuando el operador pide:

- "aprende este codebase" / "entiende este repo"
- "cómo funciona este dominio" / "explícame este sistema"
- "onboarding técnico a este proyecto"
- "mapea este código que no conozco"
- cualquier codebase o dominio nuevo que el operador quiere entender de forma
  metódica antes de tocarlo.

No usar cuando ya hay un plan cerrado que afilar (ahí toca `dev-plan-tune`),
ni cuando se necesita investigar un bug concreto (ahí toca `dev-investigate`).
En esos casos otra habilidad toma el relevo.

## Las fases del aprendizaje

El skill aprende el codebase en cinco fases. Cada fase produce un artefacto
visible que el operador revisa antes de avanzar.

1. **Orientarse.** Antes de mapear nada, ubicar el sistema en su contexto:
   qué resuelve, para quién, en qué dominio opera. Leer el README, los docs de
   arquitectura, el manifiesto del proyecto, los contratos públicos. Para cada
   pieza, preguntar: ¿qué problema ataca? ¿Qué frontera tiene con otros
   sistemas? ¿Qué lenguaje, framework o paradigma usa? Sin orientación, el
   mapa es ruido. Declarar explícitamente qué se leyó y qué se omitió — el
   operador confirma el alcance antes de profundizar.

2. **Mapear entidades.** Identificar los sustantivos del sistema: modelos de
   datos, servicios, módulos, componentes, contratos, eventos. Para cada
   entidad, declarar: ¿dónde vive (archivo o ruta)? ¿Qué responsabilidad
   tiene? ¿Con quién habla? ¿Quién la instancia? Una entidad sin dueño ni
   ubicación es un `coverage_gap`. El mapa de entidades es el esqueleto — sin
   él, los flujos no tienen dónde apoyarse.

3. **Trazar flujos.** Seguir los caminos que recorre el sistema al cumplir su
   función principal: una petición de entrada, un evento, un job. Para cada
   flujo, enumerar la secuencia de entidades que participa, las fronteras que
   cruza, los estados por los que pasa. Si un flujo se bifurca, declarar las
   ramas y su condición. Si un flujo no se completa en el código visible,
   marcar `coverage_gap` — no se inventa el tramo faltante.

4. **Formular hipótesis.** A partir del mapa y los flujos, plantear hipótesis
   sobre el comportamiento: "al recibir X, el sistema hace Y porque Z", "este
   módulo es el dueño de la verdad de W", "este evento se publica solo en
   camino de éxito". Cada hipótesis lleva su evidencia (archivo, línea, flujo)
   y su límite (qué la falsaría). Una hipótesis sin evidencia es una
   conjetura; una hipótesis sin límite es una creencia.

5. **Verificar.** Contrastar cada hipótesis contra el código: buscar el punto
   exacto donde se cumple o se rompe. Si la hipótesis sobrevive, entra al mapa
   mental como conocimiento. Si cae, se reemplaza por una hipótesis mejor o
   se marca `coverage_gap`. La verificación no es opcional — es el gate que
   separa "creo" de "sé". Un aprendizaje sin verificación es una suposición
   pulida.

**Regla anti-skip:** no se avanza de fase sin el artefacto de la fase anterior
revisado por el operador. Si el operador pide "salta al final", se responde con
el mapa parcial y se documentan los gaps; no se salta a concluir sin mapear ni
verificar. Aprende en orden — siempre.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git, commits, pushes, ni merges. Toda operación git queda detrás
  de confirmación explícita del operador.
- NO ejecuta tests, builds, installs ni comandos de CLI externos. La lectura
  es prosa para evaluación local.
- NO abre conexiones de red. No publica. No despliega.
- NO invoca tooling de vendor (`npx gstack`, `${CLAUDE_PLUGIN_ROOT}`,
  sesiones, analytics, telemetría, hooks, mockup generators). Esos artefactos
  del referenciador se descartaron en la adaptación.
- NO auto-arranca installs, dependencias ni comandos de exploración con side
  effects. Todo gate de ejecución (git, tests, installs, deploys) queda
  detrás de confirmación explícita del operador.
- Si una fase no puede completarse por falta de contexto o de acceso al
  código, se marca `coverage_gap` y se detiene — no se infiere ni se
  sustituye con una pulida conjetura.

El único entregable es el mapa mental en prosa, revisable por el operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-learn/scripts/check-skill.mjs` verifica
  presencia de tokens de gobernabilidad, ausencia de APIs prohibidas y
  completitud del fixture negativo.
- Si no hay contexto de aprendizaje (no hay codebase accesible, no hay dominio
  declarado), se emite `coverage_gap` en lugar de fabricar un mapa genérico.

Derivada de learn (garrytan/gstack, MIT).
