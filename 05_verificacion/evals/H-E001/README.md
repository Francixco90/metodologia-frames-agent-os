# H-E001 — Harness bootstraps a task from R3 route

## Metadatos

- **ID**: H-E001
- **Subsistema**: State
- **Estado**: executable (oracle.ts vía generic runner)

## Hipótesis

El harness puede bootstrapar una tarea desde la ruta R3 del router
(`02_proceso/governance/router.yml`): genera `tasks/{id}/task.yaml` que
parsea vía `TaskContractSchema` con `state: INTAKE` y `project_id` ligado a un
proyecto existente. [CONFIG]

## Precondiciones

- `router.yml` define la ruta R3 con output `new tasks/{id}/task.yaml state
INTAKE bound to project_id`. [CONFIG]
- `TaskContractSchema` (02_proceso/core/contracts/task-contract.ts) valida el
  shape generado. [CÓDIGO]
- `created_from_route` admite `R3` en el enum del schema. [CÓDIGO]

## Pasos

1. Invocar el bootstrap del harness con un input R3 (descripción de tarea +
   `project_id` existente).
2. El bootstrap escribe `04_estado/tasks/TASK-{slug}-{NNN}/task.yaml`.
3. Parsear el archivo con `TaskContractSchema.safeParse`.
4. Leer `state` y `project_id` del contrato parseado.

## Oráculo

- PASS: `safeParse` exitoso; `state === 'INTAKE'`; `project_id` no-null y
  matching `^[a-z0-9-]+$`; `created_from_route === 'R3'`.
- FAIL: parse error, o `state !== 'INTAKE'`, o `project_id` null/inválido.

## Atribución de fallo

- Subsistema: State (bootstrap wiring).
- Fuentes: `02_proceso/governance/router.yml` (R3), `02_proceso/core/contracts/task-contract.ts` (`TaskContractSchema`).
- Invariante: R3 produce `state: INTAKE` + `project_id` ligado.
- Nota: runner diferido — el bootstrap del harness aún no genera task.yaml
  automáticamente; cubrir cuando S?? cablee el bootstrap. [coverage_gap]
