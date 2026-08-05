---
name: dev-investigate
description: This skill should be used when the operator requests systematic root-cause debugging of a bug or error — it walks reproduce, isolate, hypothesize, test hypothesis, confirm root cause, and minimal-scope fix, and delivers prose findings plus a confirmed root cause for local evaluation only; it never auto-runs git, tests, or commits without operator confirmation.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Dev Investigate — debugging con causa raíz

Derivada de investigate/SKILL.md (garrytan/gstack, MIT).

## Cuándo usar

Cuando el operador pide depurar un bug o un error de forma sistemática: "depura esto", "arregla este bug", "¿por qué falla?", "investiga este error", "análisis de causa raíz". También cuando reporta un stack trace, un 500, un comportamiento inesperado, o un "ayer funcionaba".

La regla de hierro: **no se propone fix sin causa raíz confirmada**. Un fix que no ataca la causa raíz genera whack-a-mole debugging y hace el próximo bug más difícil de encontrar.

## Cómo

La investigación sigue seis fases estrictamente ordenadas. No se salta fases ni se mezclan.

1. **Reproducir.** Antes de cualquier hipótesis, el operador confirma un caso de reproducción mínimo y observable. Sin reproducción estable no hay investigación confiable; se marca `coverage_gap` y se detiene. El operador aporta el comando, los pasos, los logs o el input mínimo que dispara el síntoma.

2. **Aislar.** Acotar el síntoma a la menor superficie posible: módulo, función, ruta de código, rama de datos, versión de dependencia o estado de configuración. La pregunta es "¿dónde exactamente se rompe?" no "¿qué lo arregla?". Cada acotamiento se respalda con evidencia: logs, diff, traces, breakpoints lógicos o lectura dirigida del código. Se registra lo que se descarta con la misma importancia que lo que se confirma.

3. **Hipótesis.** Con el contexto aislado, formular una única hipótesis de causa raíz: una afirmación específica y testable sobre _qué_ está mal y _por qué_. Salida literal: **"Hipótesis de causa raíz: ..."**. Sin hipótesis acotada y testable, se vuelve a la fase 1 a reunir más evidencia; no se adivina.

4. **Testear hipótesis.** Antes de escribir cualquier fix, verificar la hipótesis con una observación dirigida: un log temporal, una aserción, una traza de depuración, o un experimento mínimo ejecutado por el operador en el caso de reproducción. ¿La evidencia observada coincide con la predicción de la hipótesis? Si la hipótesis falla, no se propone la siguiente a ciegas: se sanea el mensaje de error (sin rutas, IPs, secretos o identificadores internos), se reconsidera el patrón y se vuelve a la fase 1. Regla de tres: si tres hipótesis caen, se detiene la investigación y se escala al operador — puede ser un problema arquitectónico, no un bug puntual.

5. **Confirmar causa raíz.** La hipótesis se confirma únicamente cuando la observación dirigida explica el síntoma reproducido Y el mecanismo causal queda explícito. Se entrega al operador un hallazgo en prosa: qué está mal, por qué, qué evidencia lo confirma, y qué límite tiene la confirmación. Sin mecanismo causal explícito, no hay confirmación: se sigue marcando `coverage_gap` o se vuelve a fase 1.

6. **Fix minimal scope.** Una vez confirmada la causa raíz, se propone al operador el fix de menor alcance posible: tocar solo lo necesario para corregir la causa raíz, sin refactors no pedidos, sin reescrituras preventivas, sin remoción de manejo de errores ni de salvaguardas de seguridad. El fix se entrega como propuesta en prosa, lista para evaluación local del operador. Toda ejecución (git, tests, commits) queda tras confirmación explícita del operador.

## Fail-closed

Este skill es de **local-evaluation** y opera fail-closed:

- **No ejecuta git, tests ni commits** de forma autónoma. Toda ejecución queda detrás de confirmación explícita del operador.
- **No hace red** ni invoca CLIs externos. No publica nada.
- **No rellena una ausencia con una inferencia pulida.** Sin reproducción, sin hipótesis testable, o sin mecanismo causal explícito, se marca `coverage_gap` y se detiene.
- **No propone fix antes de confirmar la causa raíz.** Arreglar síntomas sin causa raíz confirmada está prohibido.
- **No sale del write-set declarado** ni edita fuera del alcance confirmado por el operador.

Toda salida es prosa para evaluación local del operador. El skill no muta el repo por sí mismo.

## Validación

- `pnpm verify:skills` — gate del skill (estructura, LINEAGE, fixtures, contrato).
- `node skills/dev-investigate/scripts/check-skill.mjs` — checker de gobierno del skill (recursos gobernados, clean-room, fail-closed).
- `coverage_gap` se marca cuando falta reproducción, hipótesis testable, mecanismo causal, o confirmación del operador para ejecutar.
