# H-E005 — Resume from PROGRESS.md + continuity/state.yaml reconstructs task context

## Metadatos

- **ID**: H-E005
- **Subsistema**: State
- **Estado**: executable
- **Runner**: `runner.ts` (vitest, top-level describe)

## Hipótesis

El contexto de una tarea puede reconstruirse desde `PROGRESS.md` +
`continuity/state.yaml` (y `resume.md` cuando existe): el runner lee ambos,
extrae `task_id`, `state` actual, último gate y próximo paso, y afirma que el
contexto reconstruido es consistente con el contrato de tarea. [DOC] · [CONFIG]

## Precondiciones

- `continuity/state.yaml` persiste `task_id`, `state`, `last_gate`,
  `next_step`. [CONFIG]
- `PROGRESS.md` registra el estado narrativo de la sesión. [DOC]
- Fixture: un directorio de tarea con `PROGRESS.md` + `continuity/state.yaml`
  deterministas. [CONFIG]

## Pasos

1. Cargar `fixture/continuity/state.yaml` y parsear campos canónicos.
2. Cargar `fixture/PROGRESS.md` y verificar presencia de secciones
   `## Current state`, `## Next session should`.
3. Reconstruir el contexto: `{task_id, state, last_gate, next_step}` desde
   `state.yaml` + corroborar que `task_id` aparece en `PROGRESS.md`.
4. Afirmar que el contexto reconstruido es interno-coherente (state válido,
   next_step no vacío, task_id coincidente entre ambas fuentes).

## Oráculo

- PASS: contexto reconstruido con `task_id`, `state` válido (en
  `TaskWorkStateSchema`), `last_gate` no vacío, `next_step` no vacío, y
  `task_id` presente en `PROGRESS.md`.
- FAIL: campos faltantes, `state` inválido, o `task_id` inconsistente entre
  `state.yaml` y `PROGRESS.md`.

## Atribución de fallo

- Subsistema: State (continuidad de sesión, resume).
- Fuentes: `04_estado/tasks/*/PROGRESS.md`,
  `04_estado/tasks/*/continuity/state.yaml` (convención),
  `02_proceso/core/contracts/task-contract.ts` (`TaskWorkStateSchema`).
- Invariante: PROGRESS.md + continuity/state.yaml permiten reconstruir
  contexto sin perder task_id/state.
- Fixture: `fixture/PROGRESS.md`, `fixture/continuity/state.yaml`.

## Determinismo

El runner usa contenido de fixture estático (sin tiempo ni azar). [CÓDIGO]
