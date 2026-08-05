---
name: dev-plan-tune
description: This skill should be used when el operador pide afinar un plan de ejecución ya cerrado — podar alcance a lo esencial, afilar la secuenciación, sacar dependencias ocultas, cortar desperdicio, precisar criterios de aceptación y calibrar estimaciones de esfuerzo — dejando el plan más tight, sin auto-ejecutar git, tests ni commits.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Plan Tune — afilar un plan de ejecución ya cerrado

Derivada de plan-tune (garrytan/gstack, MIT).

El rol aquí es el de un ingeniero principal que recibe un plan de ejecución ya
cerrado y lo aprieta. Un plan cerrado no es sagrado: lleva desperdicio, pasos
redundantes, dependencias ocultas, criterios borrosos y estimaciones infladas.
Este skill interroga el plan dimensión por dimensión hasta que queda tight —
sin grasa, sin ambigüedad, sin pasos que no ganan nada. El entregable es el
mismo plan, revisado y afinado en prosa, listo para que el operador decida
ejecutarlo. No código. No commits. No ejecución automática.

La premisa es simple: un plan que no se afina se ejecuta mal. "Varios pasos"
no sirve — se cuenta el número exacto—; "dependerá" no sirve — se declara la
dependencia y su gate—; "unas horas" no sirve — se calibra el esfuerzo contra
los pasos reales. No se adivina: si no se sabe algo del plan, se dice y se
pregunta, o se lee el contexto primero.

## Cuándo usar

Usar este skill cuando el operador pide:

- "afina este plan" / "aprieta el plan"
- "afila el plan de ejecución" / "tighten the plan"
- "corta el desperdicio de este plan"
- "revisa la secuenciación antes de ejecutar"
- cualquier plan de ejecución ya cerrado que el operador quiere más tight
  antes de arrancar la implementación.

No usar cuando el plan aún no existe (ahí toca especarlo primero), ni cuando
el plan ya se está ejecutando y lo que se necesita es status o rescue. En esos
casos otra habilidad toma el relevo.

## Las dimensiones del afinamiento

El skill afina el plan a lo largo de seis dimensiones. Cada dimensión produce
un artefacto visible que el operador revisa antes de avanzar.

1. **Poda de alcance.** Identificar qué pasos del plan no aportan al objetivo
   declarado. Para cada paso, preguntar: ¿qué valor entrega? ¿Qué pasa si se
   corta? Si la respuesta es "nada se rompe" o "es nice-to-have", es candidato
   a poda. Declarar explícitamente lo que se corta y por qué — el operador
   confirma antes de descartar. Un plan tight no lleva paso que no gana nada.

2. **Afilar la secuenciación.** Revisar el orden de los pasos. ¿Hay pasos que
   pueden paralelizarse? ¿Hay pasos que bloquean a otros y no se marcaron como
   gate? ¿Hay pasos que dependen de un output que otro paso aún no produce?
   Declarar dependencias explícitas: "el paso B depende del output del paso A".
   Si una dependencia está oculta, se saca a la luz. Si una secuencia es
   circular, se rompe y se reordena.

3. **Dependencias ocultas.** Cazar dependencias que el plan no nombra:
   servicios externos, configuraciones de entorno, datos que deben existir
   antes, permisos, accesos, contratos con otros equipos. Para cada
   dependencia, declarar: ¿quién la provee? ¿Cuándo se necesita? ¿Qué pasa si
   no está lista? Una dependencia sin dueño es un `coverage_gap`.

4. **Cortar desperdicio.** Identificar pasos redundantes, validaciones
   duplicadas, checks que se solapan, documentación que nadie leerá, reuniones
   que se pueden reemplazar con un mensaje. El desperdicio no es solo tiempo —
   es superficie de error. Más pasos, más lugares para fallar. Cortar es
   ganar.

5. **Precisar criterios de aceptación.** Cada paso del plan debe tener un
   criterio de aceptación observable. Si el criterio es "funciona" o "está
   listo", no es criterio — es deseo. Convertirlo en una frase verificable:
   "al llamar al endpoint X con Y, se recibe Z", "el log muestra W", "el test
   de integración pasa". Si un paso no puede tener criterio medible, marcar
   `coverage_gap` y escalar.

6. **Calibrar estimaciones de esfuerzo.** Las estimaciones del plan se
   calibran contra los pasos reales, no contra impresiones. Para cada paso:
   ¿cuántas unidades de trabajo reales conlleva? ¿Hay incertidumbre? ¿Hay
   investigación preliminar necesaria? Si una estimación es "varias horas",
   se descompone en sub-pasos hasta que cada uno tenga un rango acotado. Una
   estimación sin descomposición es una adivinanza.

**Regla anti-skip:** no se inicia ejecución sin un plan afinado y aprobado por
el operador. Si el operador pide "ejecuta ya", se responde con el plan afinado
primero; si lo rechaza, se documenta la decisión y se marca `coverage_gap` en
lugar de ejecutar a ciegas. Afina antes de ejecutar — siempre.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git, commits, pushes, ni merges. Toda operación git queda detrás
  de confirmación explícita del operador.
- NO ejecuta tests, builds, ni comandos de CLI externos. La orientación es
  prosa para evaluación local.
- NO abre conexiones de red. No publica. No despliega.
- NO invoca tooling de vendor (`npx gstack`, `${CLAUDE_PLUGIN_ROOT}`,
  sesiones, analytics, telemetría). Esos artefactos del referenciador se
  descartaron en la adaptación.
- NO auto-arranca la ejecución del plan afinado. Todo gate de ejecución
  (git, tests, commits, deploys) queda detrás de confirmación explícita del
  operador.
- Si una dimensión no puede completarse por falta de contexto, se marca
  `coverage_gap` y se detiene — no se infiere ni se sustituye con una
  pulida conjetura.

El único entregable es el plan afinado en prosa, revisable por el operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-plan-tune/scripts/check-skill.mjs` verifica
  presencia de tokens de gobernabilidad, ausencia de APIs prohibidas y
  completitud del fixture negativo.
- Si no hay contexto de plan (no hay plan cerrado, no hay objetivo claro), se
  emite `coverage_gap` en lugar de fabricar un afinamiento genérico.
