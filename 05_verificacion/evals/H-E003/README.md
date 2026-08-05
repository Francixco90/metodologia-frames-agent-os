# H-E003 — State machine rejects illegal skip (INTAKE -> COMPILADO)

## Metadatos

- **ID**: H-E003
- **Subsistema**: State
- **Estado**: spec-only (runner: deferred — se cubre vía unit test S16 sobre
  `task-machine.ts`)
- **Tipo**: spec-only

## Hipótesis

La máquina de estados de tarea (`task-machine.ts`) rechaza la transición
ilegal `INTAKE -> COMPILADO` (salto que omite `ESPECIFICADO`). Solo las 8
transiciones declaradas en `taskPolicies` son legales. [CÓDIGO]

## Precondiciones

- `taskPolicies` en `02_proceso/core/state-machine/task-machine.ts` lista
  exactamente las 8 transiciones legales; `INTAKE -> COMPILADO` no está. [CÓDIGO]
- `assertDirectTaskTransition('INTAKE', 'COMPILADO')` lanza
  `TaskStateTransitionError`. [CÓDIGO]

## Pasos

1. Construir un `TaskTransitionRequest` con `currentState: 'INTAKE'`,
   `nextState: 'COMPILADO'` y evidencia `work-built`.
2. Llamar `transitionTaskState(req)`.
3. Verificar que se lanza `TaskStateTransitionError` con mensaje
   `Illegal task state transition: INTAKE -> COMPILADO`.

## Oráculo

- PASS: `transitionTaskState` lanza `TaskStateTransitionError` (no se acepta
  el salto).
- FAIL: la transición se acepta (rompe la monotonicidad declarada).

## Atribución de fallo

- Subsistema: State (máquina de estados de tarea).
- Fuentes: `02_proceso/core/state-machine/task-machine.ts` (`taskPolicies`,
  `assertDirectTaskTransition`).
- Invariante: solo transiciones enumeradas en `taskPolicies` son legales.
- Nota: runner diferido — afirmación vía unit test S16
  (`05_verificacion/tests/unit/core/state-machine.test.ts`); no se duplica
  como runner de eval para evitar cobertura redundante. [DOC]