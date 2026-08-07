# H-E002 — Duplicate task_id detection

## Metadatos

- **ID**: H-E002
- **Subsistema**: State
- **Estado**: executable
- **Runner**: `runner.ts` (vitest, top-level describe)

## Hipótesis

El validador G_TASK detecta `task_id` duplicado cuando dos `task.yaml` bajo
`04_estado/tasks/` comparten el mismo `task_id`. La detección emite un WARN
(G_TASK_03) por el duplicado, replicando la lógica de
`05_verificacion/scripts/check-tasks.ts`. [CÓDIGO]

## Precondiciones

- `TaskContractSchema` parsea `task.yaml` y extrae `task_id`. [CÓDIGO]
- `check-tasks.ts` mantiene `seenIds` y emite `warnings` por ids repetidos. [CÓDIGO]
- Fixture: dos `task.yaml` con `task_id: TASK-dup-001` bajo un árbol temp. [CONFIG]

## Pasos

1. Crear un árbol temporal `tasks/` con dos directorios de tarea, cada uno
   con `task.yaml` válido y el mismo `task_id`.
2. Recorrer los dirs, parsear cada `task.yaml` con `TaskContractSchema`, y
   acumular ids vistos (lógica espejo de `check-tasks.ts`).
3. Recolectar warnings por ids duplicados.
4. Afirmar que se emite exactamente un WARN para el `task_id` duplicado.

## Oráculo

- PASS: se detecta el duplicado (warnings incluye `TASK-dup-001`); los dos
  task.yaml parsean correctamente.
- FAIL: no se detecta duplicado, o un task.yaml no parsea.

## Atribución de fallo

- Subsistema: State (identidad de tarea, detección de dup).
- Fuentes: `05_verificacion/scripts/check-tasks.ts` (G_TASK_03),
  `02_proceso/core/contracts/task-contract.ts` (`task_id`).
- Invariante: dos task.yaml con mismo `task_id` → WARN de duplicado.
- Fixture: `fixture/task-a.yaml`, `fixture/task-b.yaml` (mismo `task_id`).

## Determinismo

El runner usa timestamps fijos (`2026-08-01T00:00:00Z`) y hashes literales
(`'a'.repeat(64)`). No usa `Date.now` ni `Math.random`. [CÓDIGO]
