# Evals — harness v2 (S14)

Catálogo de 12 evals del harness de `metodologia-frames-agent-os` (SPEC
v2.0.0-candidate). Cada eval vive en `H-E0XX/` con su `README.md` (hipótesis,
precondiciones, pasos, oráculo, subsistema, estado, atribución-de-fallo). Tres
evals (`H-E002`, `H-E005`, `H-E008`) incluyen `runner.ts` ejecutable (vitest);
los nueve restantes ahora exponen `oracle.ts` ejecutable vía el runner genérico (`pnpm eval:run`). [DOC]

## Índice

| ID     | Título                                                                     | Tipo       | Subsistema  | Estado    |
| ------ | -------------------------------------------------------------------------- | ---------- | ----------- | --------- |
| H-E001 | Harness bootstraps a task from R3 route, task.yaml parses, state INTAKE    | executable | State       | oracle.ts |
| H-E002 | Duplicate `task_id` detection                                              | executable | State       | runner.ts |
| H-E003 | State machine rejects illegal skip (INTAKE -> COMPILADO)                   | executable | State       | oracle.ts |
| H-E004 | BLOQUEADO -> ESPECIFICADO replan allowed; BLOQUEADO -> COMPILADO rejected  | executable | State       | oracle.ts |
| H-E005 | Resume from PROGRESS.md + continuity/state.yaml reconstructs task context  | executable | State       | runner.ts |
| H-E006 | tool-policy denies guardian Edit/Write                                     | executable | Tools       | oracle.ts |
| H-E007 | commands.yaml marks G13-G17 manual + fail_closed                           | executable | Feedback    | oracle.ts |
| H-E008 | Adversarial write-set violation — path outside owner allowlist is rejected | executable | Tools       | runner.ts |
| H-E009 | run-check receipt is append-only + sha256-bound                            | executable | Feedback    | oracle.ts |
| H-E010 | Router R3-LOOSE creates `project_id: null` task                            | executable | Environment | oracle.ts |
| H-E011 | doctor reports 6 receipt families                                          | executable | Feedback    | oracle.ts |
| H-E012 | backfill dedup preserves `meta.original_id`                                | executable | State       | oracle.ts |

Subsistemas SPEC (5, canónicos): Instructions, Tools, Environment, State,
Feedback. Mapping SPEC ↔ harness-creator (7, scoring interno) en
`02_proceso/governance/harness-subsystem-reconciliation.md`. [CONFIG]

## Ejecución

Los tres runners ejecutables corren bajo vitest vía el test de integración:

```
pnpm test tests/integration/harness/evals.test.ts
```

Los runners importan lógica de `02_proceso/core/contracts/` (`TaskContractSchema`)
y replican invariantes de `05_verificacion/scripts/check-tasks.ts` sobre
fixtures temporales deterministas (sin `Date.now` ni `Math.random`). [CÓDIGO]

## SPEC §10 — Disclaimer de validez

Estos evals son una **benchmark estructural de sesión única y agente único
(n=1)**. No constituyen evidencia causal de efectividad del harness en uso
real. [DOC]

- Cada eval verifica un invariante estructural del harness (schema, máquina de
  estados, gobernanza, continuidad), no un resultado de tarea agéntica.
- Las afirmaciones de cada eval están acotadas al fixture bajo prueba y al
  oráculo declarado; no se generalizan a población de agentes ni a sesiones
  múltiples sin réplicas.
- Intervalo de confianza: Wilson 95% CI sobre n=1 es
  `[, ]` no informativo (no se reporta por estar vacío); cualquier cita de
  tasa de paso debe acompañarse de `n=1, single-session, single-agent` y del
  oráculo específico. [DOC]
- Un PASS verde en estos evals **no** implica `HUMAN_APPROVED`, `READY` ni
  `PUBLISHED` (estados no negociables del repo). Confirma sólo que el
  invariante declarado se sostiene para el fixture. [CONFIG]

## Atribución de fallo

Cada eval declara `atribución-de-fallo` (dónde buscar cuando el oráculo rompe):
subsistema + archivo fuente + invariante. Un fallo apunta a un bug en el
código o en el fixture, no a una deficiencia del agente bajo prueba (los evals
no ejecutan un agente; ejecutan invariantes del harness). [DOC]
