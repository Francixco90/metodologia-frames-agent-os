---
name: dev-test-driven-development
description: This skill should be used when el operador va a implementar una feature o un bugfix y debe seguir el ciclo rojo-verde-refactor — escribir el test fallido primero, hacerlo pasar con código mínimo y refactorizar — sin auto-ejecutar tests que muten estado, commits ni deploys.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Test-Driven Development — ciclo rojo-verde-refactor, método

El rol aquí es el de un ingeniero que implementa una feature o un bugfix
guiado por tests, no por suposiciones. La disciplina es simple: escribir el
test que define el comportamiento deseado, verlo fallar, escribir el código
mínimo para hacerlo pasar y luego refactorizar manteniendo el verde. Este
skill recorre el ciclo rojo-verde-refactor en prosa y entrega el plan de
tests para que el operador lo ejecute. No auto-ejecuta tests que mutan. No
commitea. No despliega.

La premisa: si no viste el test fallar, no sabes si prueba lo correcto. Un
test escrito después de la implementación pasa de inmediato — no prueba
nada, porque está sesgado por el código que ya escribiste. El test primero
obliga a la falla; la falla demuestra que el test puede atrapar el bug. Sin
falla observada, no hay TDD.

## Cuándo usar

Usar este skill cuando el operador pide:

- "implementa esta feature" / "agrega este comportamiento"
- "corrige este bug" / "arregla este defecto"
- "refactoriza esto sin cambiar comportamiento"
- cualquier cambio de código de producción que debe protegerse contra
  regresión.

No usar para prototipos desechables, código generado o archivos de
configuración pura — ahí el ciclo no aporta valor y el operador puede
eximirlo explícitamente. "Saltar TDD solo esta vez" es racionalización: si
aplica, aplica.

## La ley de hierro

NINGÚN código de producción sin un test fallido primero. Si escribiste el
código antes que el test, bórralo y empieza de nuevo. No lo guardes como
"referencia", no lo "adaptes", no lo mires. Implementar fresco desde los
tests. Punto.

## El ciclo rojo-verde-refactor

El skill recorre el cambio en cinco pasos. Cada paso produce un artefacto
visible que el operador revisa antes de avanzar.

1. **Rojo — escribir el test fallido.** Escribir un test mínimo que captura
   el comportamiento deseado: un comportamiento por test, nombre claro que
   describe la conducta, código real antes que mocks. Si no puedes nombrar
   el cambio de producción que haría fallar el test antes de escribirlo, el
   test no está listo.

2. **Verificar el rojo — verlo fallar.** MANDATORIO, nunca se salta. Correr
   el test y confirmar: falla (no error), el mensaje de falla es el
   esperado, falla porque la feature falta (no por un typo). Si pasa de
   inmediato, estás probando comportamiento existente — arregla el test. Si
   erra, arregla el error y vuelve a correr hasta que falle bien. Esta
   ejecución muta estado y queda detrás de confirmación del operador.

3. **Verde — código mínimo.** Escribir el código más simple que haga pasar
   el test. Sin features extra, sin refactor ajeno, sin "mejoras" más allá
   del test. YAGNI: lo que el test no pide no se escribe.

4. **Verificar el verde — verlo pasar.** MANDATORIO. Correr el test y
   confirmar: pasa, los demás tests siguen pasando, el output está limpio
   sin warnings. Si falla, arregla el código, no el test. Si otros tests
   fallan, arréglalo ahora.

5. **Refactor — limpiar.** Solo después de verde: eliminar duplicación,
   mejorar nombres, extraer helpers. Mantener los tests en verde. No
   agregar comportamiento durante el refactor.

**Regla anti-skip:** no se avanza de paso sin el artefacto del paso
anterior verificado por el operador. Si el operador pide "salta al verde",
se responde con el test fallido documentado y se detiene — no se salta a
implementar sin rojo verificado.

## Protección de regresión

El valor del ciclo no es el test individual: es la red de tests que queda
como red de seguridad. Cada test que se escribe y se ve fallar es evidencia
de que el código puede romperse de esa forma y de que el test lo atrapa. Un
bug que se reproduce con un test fallido no vuelve a aparecer sin que el
test lo delate. Sin esa red, cada cambio es una apuesta a ciegas.

## Trampas comunes

| Excusa                                   | Realidad                                                                                                                                                                            |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Muy simple para testear"                | El código simple se rompe. El test toma 30 segundos.                                                                                                                                |
| "Lo pruebo después"                      | Los tests escritos después pasan de inmediato — no prueban nada. Están sesgados por el código que ya escribiste.                                                                    |
| "Ya lo probé manualmente"                | La prueba manual es ad-hoc: sin registro, sin re-ejecución, sin casos límite. No reemplaza un test automatizado.                                                                    |
| "Ya pasé X horas, borrar es desperdicio" | Costo hundido. La elección real es reescribir con TDD (alta confianza) vs. keeper y bolear tests después (baja confianza).                                                          |
| "Lo guardo como referencia"              | Lo vas a adaptar. Eso es test-after. Borrar significa borrar.                                                                                                                       |
| "TDD me frena"                           | TDD es el camino pragmático: atrapa bugs antes del commit, previene regresión, permite refactor sin miedo. Los atajos "pragmáticos" significan debugging en producción — más lento. |
| "Test difícil = diseño confuso"          | Escucha al test. Difícil de testear es difícil de usar.                                                                                                                             |

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git, commits, pushes ni merges. Toda operación git queda
  detrás de confirmación explícita del operador.
- NO auto-ejecuta tests, builds ni comandos de CLI que muten estado. La
  ejecución del test (rojo, verde) requiere confirmación explícita del
  operador — el skill propone el test, el operador lo corre.
- NO abre conexiones de red. No publica. No despliega.
- NO invoca tooling de vendor (`npx`, sesiones, analytics, telemetría,
  hooks). Los artefactos del referenciador superpowers se descartaron en la
  adaptación.
- Si no hay contexto suficiente (no hay feature declarada, no hay bug
  reproducido), se emite `coverage_gap` en lugar de fabricar un ciclo
  genérico.

El único entregable es el plan de tests en prosa, revisable por el operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-test-driven-development/scripts/check-skill.mjs`
  verifica presencia de tokens de gobernabilidad, ausencia de APIs
  prohibidas y completitud del fixture negativo.
- Si no hay cambio declarado (no hay feature, no hay bug), se emite
  `coverage_gap` en lugar de fabricar un ciclo TDD genérico.

## Lineage

Derivada de superpowers/test-driven-development (obra/superpowers, MIT).
