---
name: dev-verification-before-completion
description: This skill should be used when an agent is about to claim work is complete, fixed, passing, or ready and must obtain fresh, scope-matched evidence before that claim.
version: 0.3.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Verification Before Completion

Aplica una regla: ninguna afirmación de éxito sin evidencia fresca que pruebe exactamente
esa afirmación. Derivada de verification-before-completion (obra/superpowers, MIT) mediante
adaptación clean-room.

## Activación

Usar antes de decir “listo”, “corregido”, “pasa”, “ready”, cerrar tarea, avanzar de gate,
commit o PR. También después de un reporte de otro agente. Leer [context.md](context.md), el
contrato de tarea, candidate congelado y checks aplicables.

## Gate de evidencia

1. Escribir la afirmación propuesta.
2. Identificar qué prueba material la demostraría y qué no demostraría.
3. Ejecutar el comando completo y fresco mediante argv seguro, si la tarea autoriza
   ejecución local; de lo contrario pedir al operador el receipt.
4. Leer exit code, salida, conteos y alcance. No extrapolar un check focal al corpus.
5. Comparar evidencia con requisitos, no solo con expectativas técnicas.
6. Para trabajo mutante, comprobar que `DocumentationImpactPlanV1` precedió el cambio y
   que el candidate congelado tiene `DocumentationClosureReceiptV1` hash-bound con PASS.
7. Emitir `PASS | FAIL | UNKNOWN | BLOCKED`; solo PASS permite la afirmación.

Una salida truncada, stale, de otra base o sin comando/artefacto identificable es UNKNOWN.
Una mutación no está terminada hasta que RT-09 conceda `DOCS_TRANSVERSAL_COMPLETE`;
`NOT_APPLICABLE` exige reason code y un cambio posterior invalida el receipt.

## Matriz mínima

| Afirmación           | Evidencia suficiente               | Insuficiente             |
| -------------------- | ---------------------------------- | ------------------------ |
| Tests pasan          | suite declarada, 0 fallos, exit 0  | ejecución previa         |
| Build correcto       | build completo, exit 0             | lint o typecheck aislado |
| Bug corregido        | reproducción original + regresión  | diff plausible           |
| Requisitos cumplidos | checklist requisito-evidencia      | tests verdes             |
| Agente terminó       | diff, outputs y checks releídos    | reporte del agente       |
| Publicable           | aprobación humana y receipt exacto | merge o Guardian PASS    |

## Independencia

Verificar solo el candidate congelado. Un verifier no remedia: `REVISE` devuelve defectos y
abre successor. Producer, RT-09 y Guardian usan identidades distintas cuando lo exige el
contrato. Una skill declarada sin invocation receipt permanece `planned`.

## Determinismo y replay

Fijar base, inputs, versiones, reloj/azar cuando aplique y red denegada. Hashes se calculan
desde outputs materiales; timestamp y duración quedan fuera del digest. Si dos replays
normalizados difieren, el estado es FAIL o UNKNOWN según evidencia.

## Casos borde

- Check parcial: declarar exactamente qué superficie pasó.
- Test flaky: no reintentar hasta verde sin registrar intentos y causa.
- Herramienta ausente: `coverage_gap`; no sustituir con revisión visual.
- Cambios posteriores al check: invalidar evidencia y repetir.
- Check manual: requiere observación humana real, no simulación.
- Fallo externo: preservar outputs válidos y separar defecto de cobertura.

## Reporte

Entregar afirmación evaluada, base/candidate hash, comandos, resultados, gaps, riesgos,
efectos externos y siguiente gate. Evitar satisfacción o lenguaje de cierre si el estado no
es PASS.

## Límites

Operación **fail-closed** y `local-evaluation`: no commit, push, merge, publicación ni
remediación implícita. Los checks locales reversibles requieren autorización del contrato;
efectos externos quedan bloqueados. Sin evidencia fresca, declarar `coverage_gap`.

## Validación

El checker local exige versión, lineage, fixtures, [context.md](context.md), ocho headings,
presupuesto y ausencia de APIs/rutas prohibidas. `pnpm verify:skills` valida integración;
configuración o intención no equivale a ejecución.
