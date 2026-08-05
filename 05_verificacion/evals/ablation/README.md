# Ablation harness — harness v2 (S15)

Ablation benchmark de `metodologia-frames-agent-os`: 6 variantes (H0 baseline
+ 5 exclusiones de subsistema) corridas bajo un **oráculo fijo determinista**.
Mide la **tasa de tareas aceptadas por el oráculo fijo** cuando se excluye un
subsistema SPEC del harness. [DOC]

## SPEC §10 — Disclaimer de validez

Este ablation es un **benchmark estructural de sesión única y agente único
(n=1 por variante)**. No constituye evidencia causal de efectividad del
harness ni de la importancia de ningún subsistema. [DOC]

- **n=1 por variante**: bajo power estadístico. El intervalo **Wilson 95% CI**
  sobre n=1 es no informativo (un único ensayo binario no acota una
  proporción); cualquier tasa reportada va acompañada de `n=1, single-session,
  single-agent` y del oráculo declarado. [DOC]
- **Claims acotadas al benchmark**: las afirmaciones se limitan a este
  fixture, este oráculo y esta sesión. No se generalizan a población de
  agentes ni a sesiones múltiples sin réplicas. [CONFIG]
- **Contribución marginal != cuello de botella causal**: que excluir un
  subsistema degrade la tasa de aceptación en este benchmark **no** implica
  que ese subsistema sea el cuello de botella causal del harness en uso real.
  La atribución causal requiere diseño experimental con réplicas, un agente
  bajo prueba y un dominio de tareas; este ablation no los tiene. [DOC]
- El oráculo es un evaluador externo **constante** (misma función `judgeTask`
  para H0..H-F); no hay oráculo por variante. [CÓDIGO]
- Un resultado de aceptación **no** implica `HUMAN_APPROVED`, `READY` ni
  `PUBLISHED` (estados no negociables del repo). Confirma sólo que el
  `task.yaml` parsea y los artefactos no-excluidos están presentes. [CONFIG]

## Variantes

Subsistemas SPEC (5, canónicos): Instructions, Tools, Environment, State,
Feedback. Fuente:
`02_proceso/governance/harness-subsystem-reconciliation.md`. [CONFIG]

| Variante | Subsistema excluido | Levers deshabilitadas | Degradación del task.yaml | Oráculo (esperado) |
|----------|---------------------|----------------------|---------------------------|--------------------|
| H0 | ninguno (baseline) | — | sin degradación | aceptado |
| H-I | Instructions | `tool-policy.yml` + `router.yml` + `AGENTS.md` regla 11 | `done: ""` (sin definición de done) | rechazado (schema min 1) |
| H-T | Tools | `commands.yaml` + validación `check-dag` | `write_set` con path fuera de allowlist | aceptado (oráculo de shape; allowlist es H-E008) |
| H-E | Environment | `doctor.ts` + scripts `package.json` | `inputs` referencia path inexistente | aceptado (oráculo de shape; existencia no es invariante de schema) |
| H-S | State | `task-machine.ts` + `task-contract.ts` enforcement | `state: ENTREGADO` + `gate_target: G15` (auto-ENTREGADO a gate manual) | rechazado (superRefine G13-G17 fail-closed) |
| H-F | Feedback | `run-check.ts` + `check-receipts` + `check-tasks` | `validacion: ""` (sin criterio de verificación) | rechazado (schema min 1) |

Cada variante vive en `H<X>/config.yml` con `variant_id`, `excluded_subsystem`
(`null` para H0), `description`, `levers_disabled`, `n: 1`, `oracle_ref` y
`benchmark_ref`. [CONFIG]

## Metodología

1. **Runner** (`runner.ts`): carga `H<X>/config.yml`, crea un fixture temporal
   determinista, muta el `task.yaml` según la variante (degradación
   subsistema-específica), escribe marcadores de artefacto `.harness/*.present`
   para los subsistemas **no excluidos**, invoca `oracle.judgeTask`, devuelve
   `{variant_id, accepted, reason}`. [CÓDIGO]
2. **Oráculo fijo** (`oracle.ts`): `judgeTask(taskDir, config)` acepta la
   tarea si (a) `task.yaml` parsea vía `TaskContractSchema` (incluye validez
   de estado enum + superRefine ENTREGADO/G13-G17) y (b) los marcadores de
   artefacto de todos los subsistemas **no excluidos** están presentes. El
   oráculo es **constante** (misma lógica para H0..H-F) y **determinista** (sin
   `Date.now`, sin `Math.random`). [CÓDIGO]
3. **Métrica**: tasa de tareas aceptadas por el oráculo fijo, por variante.
   n=1. Wilson 95% CI no informativo (reportar con disclaimer). [DOC]
4. **Diseño**: excluir un subsistema **degrada** el contrato de tarea de forma
   variante-específica. El oráculo juzga la **shape** del contrato, no la
   semántica completa del harness. Algunas exclusiones producen contratos
   schema-inválidos (rechazados); otras producen contratos schema-válidos pero
   semánticamente degradados (aceptados por el oráculo de shape). Esto es
   intencional y honesto: el oráculo no claims cubrir invariantes fuera de su
   perimeter (e.g. allowlist es H-E008, no este oráculo). [DOC]

### Resultados del benchmark

El test de integración (`tests/integration/harness/ablation.test.ts`) corre
las 6 variantes y registra los resultados. No afirma claims causales. Los
resultados se acotan a: `n=1, single-session, single-agent, oráculo fijo
oracle.ts, fixture BASE_TASK + mutaciones por variante`. [DOC]

## Cómo correr

```
pnpm test tests/integration/harness/ablation.test.ts
```

El test importa `runVariant` de `runner.ts` y ejecuta H0..H-F. Verifica que
cada variante devuelve un resultado y que H0 baseline es `accepted=true`. No
afirma claims causales. [CÓDIGO]

## Atribución de fallo

Cada rechazo del oráculo apunta a una causa **estructural** en el contrato
degradado, no a una deficiencia del agente bajo prueba (el ablation no
ejecuta un agente; ejecuta contratos degradados contra un oráculo fijo).
[DOC]

| Variante | Si el oráculo rompe inesperadamente, buscar en |
|----------|------------------------------------------------|
| H0 | `BASE_TASK` shape vs `TaskContractSchema`; marcadores `.harness/` |
| H-I | campo `done` (min 1); `TaskContractSchema` |
| H-T | `write_set` paths (RelativePathSchema); `oracle.ts` (no checkea allowlist) |
| H-E | `inputs` paths (RelativePathSchema); `oracle.ts` (no checkea existencia) |
| H-S | `state` + `gate_target` superRefine; `task-machine.ts` |
| H-F | campo `validacion` (min 1); `TaskContractSchema` |

Un fallo del oráculo apunta a un bug en `oracle.ts`, en `runner.ts`, en el
`config.yml` de la variante, o en `TaskContractSchema` — no a una deficiencia
del agente. [CONFIG]

## No-objetivos

- No claim cuello de botella causal. [CONFIG]
- No correr más de n=1 por variante. [CONFIG]
- No usar `Date.now`/`Math.random` (oráculo y runner deterministas). [CONFIG]
- No cablear a scripts de `package.json` ni auto-avanzar gates. [CONFIG]
- Claims acotadas al benchmark con Wilson 95% CI + disclaimer. [CONFIG]