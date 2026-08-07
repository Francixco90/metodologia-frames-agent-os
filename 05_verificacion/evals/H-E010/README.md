# H-E010 — Router R3-LOOSE creates project_id:null task

## Metadatos

- **ID**: H-E010
- **Subsistema**: Environment
- **Estado**: executable (oracle.ts vía generic runner)

## Hipótesis

La ruta R3-LOOSE del router crea una tarea loose con `project_id: null`
(first-class loose task, sin proyecto ligado). El `TaskContractSchema` admite
`project_id: null` y `created_from_route: 'R3-LOOSE'`. [CONFIG] · [CÓDIGO]

## Precondiciones

- `router.yml` define R3-LOOSE con output `new tasks/{id}/task.yaml with
project_id: null — first-class loose task`. [CONFIG]
- `TaskContractSchema.project_id` es `z.string().nullable()`. [CÓDIGO]
- `TaskContractSchema.created_from_route` admite `'R3-LOOSE'`. [CÓDIGO]
- Fixture real: `04_estado/tasks/TASK-loose-001/task.yaml` con
  `project_id: null`, `created_from_route: R4` (backfilled). [DOC]

## Pasos

1. Invocar el bootstrap del harness con un input R3-LOOSE (tarea sin
   proyecto).
2. El bootstrap escribe `04_estado/tasks/TASK-LOOSE-{NNN}/task.yaml`.
3. Parsear con `TaskContractSchema.safeParse`.
4. Verificar `project_id === null` y `created_from_route === 'R3-LOOSE'`.

## Oráculo

- PASS: parse exitoso; `project_id === null`; `created_from_route === 'R3-LOOSE'`.
- FAIL: `project_id` no-null, o `created_from_route` distinto, o parse error.

## Atribución de fallo

- Subsistema: Environment (router + layout de tareas loose).
- Fuentes: `02_proceso/governance/router.yml` (R3-LOOSE),
  `02_proceso/core/contracts/task-contract.ts` (`project_id` nullable,
  `created_from_route` enum).
- Invariante: R3-LOOSE produce `project_id: null`.
- Nota: runner diferido — bootstrap no cableado; el fixture `TASK-loose-001`
  confirma el shape parseable con `project_id: null` (backfilled desde R4).
  [coverage_gap]
