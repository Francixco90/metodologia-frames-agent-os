# H-E004 — BLOQUEADO -> ESPECIFICADO replan allowed; BLOQUEADO -> COMPILADO rejected

## Metadatos

- **ID**: H-E004
- **Subsistema**: State
- **Estado**: spec-only (runner: deferred — se cubre vía unit test S16 sobre
  `task-machine.ts`)
- **Tipo**: spec-only

## Hipótesis

La máquina de estados de tarea permite la única transición no-monótona
`BLOQUEADO -> ESPECIFICADO` (replan, con evidencia `replan`) y rechaza
`BLOQUEADO -> COMPILADO`. `BLOQUEADO` nunca avanza a `COMPILADO`. [CÓDIGO]

## Precondiciones

- `taskPolicies` incluye `{from: 'BLOQUEADO', to: 'ESPECIFICADO', guard:
  replanGuard}`. [CÓDIGO]
- `taskPolicies` no incluye ninguna política con `from: 'BLOQUEADO'` y
  `to: 'COMPILADO'`. [CÓDIGO]
- `replanGuard` exige evidencia kind `replan`. [CÓDIGO]

## Pasos

1. Construir `TaskTransitionRequest` con `currentState: 'BLOQUEADO'`,
   `nextState: 'ESPECIFICADO'` y evidencia `replan`; llamar
   `transitionTaskState` → debe retornar `'ESPECIFICADO'`.
2. Construir `TaskTransitionRequest` con `currentState: 'BLOQUEADO'`,
   `nextState: 'COMPILADO'` y evidencia `work-built`; llamar
   `transitionTaskState` → debe lanzar `TaskStateTransitionError`.
3. (Negativo de guard) `BLOQUEADO -> ESPECIFICADO` sin evidencia `replan` →
   lanza `TaskStateTransitionError` con mensaje del guard.

## Oráculo

- PASS: paso 1 acepta; pasos 2 y 3 rechazan con `TaskStateTransitionError`.
- FAIL: paso 2 acepta (BLOQUEADO avanza a COMPILADO), o paso 1 rechaza, o
  paso 3 acepta sin evidencia `replan`.

## Atribución de fallo

- Subsistema: State (máquina de estados de tarea, rama replan).
- Fuentes: `02_proceso/core/state-machine/task-machine.ts` (`taskPolicies`,
  `replanGuard`, `assertDirectTaskTransition`).
- Invariante: BLOQUEADO sólo sale vía replan a ESPECIFICADO.
- Nota: runner diferido — afirmación vía unit test S16. [DOC]