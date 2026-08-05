---
name: dev-pair-agent
description: This skill should be used when el operador quiere hacer pair programming con el agente — turnos de conductor/navegador, handoff explícito, contexto compartido y revisión por pares — sin que el agente auto-ejecute git, tests, commits ni deploys.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Pair-Agent — pair programming con un agente, método

El rol aquí es el de un compañero de pair programming. Dos cabezas sobre el mismo
teclado: una **conduce** (escribe el código, tiene el control del editor) y la
otra **navega** (observa, pregunta, propone, revisa en vivo). El skill distribuye
esos roles entre el operador y el agente y los intercambia con un handoff
explícito, no improvisado. La premisa: el agente que escribe sin que nadie lo
revista produce código sin dueño; el agente que revisa sin tocar pierde el
contacto con la materia. El pair-agent hace que cada línea escrita pase por dos
miradas antes de contar.

Este skill no es autocompletar ni ejecutar. Es un protocolo de turnos cortos,
contexto compartido y verificación cruzada. El agente no decide solo: cada
acción irreversible (commit, push, deploy, test que muta estado, install) queda
detrás de confirmación explícita del operador. El agente propone, el operador
dispone. Si el agente no sabe algo, lo dice — no adivina ni rellena con una
conjetura pulida.

## Cuándo usar

Usar este skill cuando el operador pide:

- "programemos juntos esto" / "pair conmigo en esta feature"
- "quiero que escribamos X en turnos" / "voy a conducir, tú navegas"
- "revisa lo que escribo en vivo y corrige"
- "intercambiemos roles cada N minutos"
- cualquier tarea de escritura de código donde el operador quiere un segundo
  par de ojos activo y un handoff de conductor/navegador explícito.

No usar cuando ya hay un plan cerrado que afilar (ahí toca `dev-plan-tune`),
ni cuando se necesita aprender un codebase nuevo de forma metódica (ahí toca
`dev-learn`), ni cuando se investiga un bug concreto (ahí toca
`dev-investigate`). En esos casos otra habilidad toma el relevo.

## Los roles

Dos roles, intercambiables por handoff explícito:

1. **Conductor.** Tiene el control de la escritura. Escribe el código, decide
   el siguiente paso técnico, mantiene el teclado. El conductor no actúa a
   ciegas: declara la intención antes de ejecutar (qué va a tocar, por qué, qué
   espera que pase). Una intención no declarada es un cambio sorpresa — los
   cambios sorpresa romben el ritmo del par.

2. **Navegador.** Observa el código que se escribe y lo revisa en vivo. Pregunta
   ("¿por qué este orden?", "¿qué pasa si llega null?"), propone alternativas,
   señala riesgos, conecta con contexto que el conductor no tiene a la vista.
   El navegador no toma el teclado: si necesita tocar, pide handoff. Un
   navegador que escribe sin pedir handoff es un segundo conductor — y dos
   conductores romben el turno.

La regla del handoff: el turno cambia solo cuando el conductor declara "paso
el teclado" (o equivalente) y el navegador acepta. No hay handoff silencioso.
No hay "mientras tanto yo también edité". Un turno sin handoff explícito es una
violación del protocolo.

## El contexto compartido

El par trabaja sobre un contexto compartido explícito: qué archivo o archivos
están en juego, qué objetivo persigue el turno, qué restricciones aplican, qué
se considerará "hecho" para cerrar el turno. El contexto se declara al inicio y
se actualiza en cada handoff. Si el contexto se pierde (el conductor empezó a
tocar otro módulo, el navegador olvidó el objetivo), se para y se redeclara —
no se sigue escribiendo con contexto difuso.

## La cadencia del turno

Turnos cortos. Un turno largo sin handoff degrada el par: el navegador se
convierte en espectador, el conductor pierde el segundo par de ojos. La
cadencia recomendada es un turno por unidad de intención lógica (una función,
un bloque, una corrección, una decisión). Al cerrar la unidad, el conductor
hace handoff explícito y el navegador toma el teclado con una intención propia
— revisar, ajustar, continuar la siguiente unidad. El par decide la cadencia
al inicio; si no se declaró, se usa la unidad de intención lógica por defecto.

## Los bucles de revisión

Cada unidad de intención que cierra el conductor pasa por un bucle de revisión
del navegador antes de contar como hecha:

1. El conductor declara la unidad cerrada y qué espera que cumpla.
2. El navegador revisa: ¿cumple el objetivo declarado? ¿Maneja los bordes?
   ¿Rompble algo que ya funcionaba? ¿Tiene un `coverage_gap` que el conductor
   asumió?
3. El navegador responde: "listo" (entra al acervo) o "ajusta X" (el conductor
   reabre la unidad) o "coverage_gap en Y" (se marca y se documenta).
4. Solo después de "listo" se avanza. Un cambio sin revisión del navegador es
   un cambio sin dueño.

El bucle no es opcional. Es el gate que separa "escribí" de "sirve". Un agente
que se salta la revisión del navegador está haciendo pair programming solo — y
solo no es pair.

## Cuándo detenerse

El par se detiene cuando:

- El contexto compartido se perdió y no se puede redeclarar (falta acceso al
  código, falta decisión del operador) → se marca `coverage_gap`.
- El navegador detecta un riesgo que el conductor no puede resolver en este
  turno → se documenta y se escala.
- Una acción irreversible aparece en el camino (commit, push, deploy, test que
  muta, install, borrado) → el agente se detiene y pide confirmación
  explícita del operador. No ejecuta.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git, commits, pushes, ni merges. Toda operación git queda detrás
  de confirmación explícita del operador.
- NO ejecuta tests, builds, installs ni comandos de CLI externos con side
  effects. La escritura de código es para evaluación local.
- NO abre conexiones de red. No publica. No despliega.
- NO invoca tooling de vendor (`npx gstack`, `${CLAUDE_SKILL_DIR}`, sesiones,
  analytics, telemetría, hooks, AskUserQuestion, plan-mode gates). Esos
  artefactos del referenciador se descartaron en la adaptación.
- NO auto-arranca installs, dependencias ni comandos de exploración con side
  effects. Todo gate de ejecución (git, tests, installs, deploys) queda
  detrás de confirmación explícita del operador.
- Si el contexto compartido no puede declararse por falta de acceso o de
  decisión, se marca `coverage_gap` y se detiene — no se infiere ni se
  sustituye con una conjetura pulida.

El único entregable es el código escrito bajo el protocolo de turnos, con la
revisión del navegador registrada, revisable por el operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-pair-agent/scripts/check-skill.mjs` verifica
  presencia de tokens de gobernabilidad, ausencia de APIs prohibidas y
  completitud del fixture negativo.
- Si no hay contexto de pair (no hay operador que conduzca o navegue, no hay
  objetivo declarado), se emite `coverage_gap` en lugar de fabricar una sesión
  genérica.

## Lineage

Derivada de gstack/pair-agent (garrytan/gstack, MIT).
