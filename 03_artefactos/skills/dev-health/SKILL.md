---
name: dev-health
description: This skill should be used when <diagnosing repository or project health and triaging decay signals> — inventariar la pila de herramientas de salud, inspeccionar seguridad de tipos, lint, tests, código muerto y scripts, calcular un score compuesto 0-10, identificar regresiones contra el histórico y priorizar recomendaciones — sin auto-ejecutar git, tests, installs, fixes ni deploys.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Health — diagnosticar la salud de un repositorio y triagear señales de decay

Derivada de health (garrytan/gstack, MIT).

El rol aquí es el de un ingeniero de staff que owns el dashboard de calidad del
código. Sabe que la salud no es una métrica — es un compuesto: seguridad de
tipos, limpieza de lint, cobertura de tests, código muerto e higiene de scripts.
Este skill recorre cada dimensión, produce un dashboard claro en prosa, triagea
las señales de decay y prioriza recomendaciones para que el operador decida qué
atacar. No arregla nada. El operador decide. El dashboard es de solo lectura.

La premisa es simple: un repo que no se diagnostica se pudre en silencio. "Funciona"
no es salud — los tests pasan pero el typechecker grita, el lint acumula warnings,
knip reporta exports huérfanos y nadie lo mira. Este skill hace visible el decay:
corre las herramientas del proyecto (no las suyas), puntúa cada categoría, arma un
compuesto y compara contra el histórico.

## Cuándo usar

Usar este skill cuando el operador pide:

- "qué tan sano está este repo" / "health check" / "code quality"
- "dashboard de calidad del código" / "quality score"
- "corre todas las verificaciones" / "run all checks"
- "hay regresiones de calidad" / "cómo va la salud vs la última vez"
- cualquier diagnóstico de salud del repositorio antes de decidir qué atacar.

No usar cuando lo que se necesita es arreglar un bug específico (ahí toca
investigar la causa), ni cuando se quiere publicar o desplegar (ahí toca el gate
de publicación). En esos casos otra habilidad toma el relevo.

## Las dimensiones del diagnóstico

El skill diagnostica la salud a lo largo de seis dimensiones. Cada dimensión
produce un puntaje 0-10 y una lista visible de hallazgos que el operador revisa
antes de avanzar.

1. **Inventario de la pila de salud.** Detectar qué herramientas existen para
   evaluar salud: typechecker, linter, test runner, detector de código muerto,
   linter de shell. Si hay una sección `## Health Stack` en la memoria del
   proyecto, usar esas herramientas exactas — no second-guess. Si no, listar las
   detectadas y dejar que el operador confirme. Una herramienta que no existe no
   es un fracaso — se salta y se redistribuye su peso. No se sustituye la
   herramienta del proyecto por un análisis propio: se envuelve, no se reemplaza.

2. **Seguridad de tipos.** Correr el typechecker del proyecto y capturar errores.
   Señales de decay: errores de tipo, `any` explícitos, tipos rotos que el
   typechecker reporta. Contar las líneas que reportan errores. Puntaje 10 =
   limpio (exit 0); 7 = menos de 10 errores; 4 = menos de 50; 0 = 50 o más. Si no
   hay typechecker, se salta y se redistribuye el peso.

3. **Lint y estilo.** Correr el linter y capturar warnings y errores. Señales de
   decay: warnings de complejidad, patrones sospechosos, estilo inconsistente,
   `any` inesperado. Contar los hallazgos. Puntaje 10 = limpio; 7 = menos de 5
   warnings; 4 = menos de 20; 0 = 20 o más. Si no hay linter, se salta.

4. **Tests y cobertura.** Correr el test runner y capturar pass/fail. Señales de
   decay: tests fallidos, pass rate por debajo del umbral, cobertura que cae. Si
   el runner solo reporta exit code: exit 0 = 10, exit non-zero = 4 (asume
   fallas). Puntaje 10 = todos pasan; 7 = más de 95% pasan; 4 = más de 80%; 0 =
   80% o menos. Si no hay test runner, se salta.

5. **Código muerto y desperdicio.** Correr el detector de código muerto (knip o
   equivalente). Señales de decay: exports sin usar, archivos huérfanos,
   dependencias no usadas. Puntaje 10 = limpio; 7 = menos de 5 exports sin usar;
   4 = menos de 20; 0 = 20 o más. El código muerto no es solo desperdicio — es
   superficie de error: más código, más lugares para podrir.

6. **Scripts y configuración.** Lint de shell sobre los scripts del repo.
   Señales de decay: scripts con errores de shell, configuración drift, paths
   rotos. Puntaje 10 = limpio; 7 = menos de 5 issues; 4 = 5 o más; si no aplica
   (no hay shell scripts), se salta. El skill NO arregla los scripts — solo los
   reporta.

**Compuesto y triage.** Calcular el score compuesto ponderado: seguridad de tipos
(22%), lint (18%), tests (28%), código muerto (13%), scripts (9%), y el resto
redistribuido proporcionalmente cuando una categoría se salta. Identificar qué
categorías cayeron vs la medición anterior y correlacionar el delta con el output
crudo de la herramienta — no con conjeturas. Mostrar el output real (últimas 50
líneas) para que el operador actúe sin re-correr nada.

**Tendencia.** Leer el histórico de scores. Si no hay histórico, declarar
"primera medición — sin tendencia todavía" y dejar que el operador decida cuándo
medir de nuevo. Si el score cayó, identificar qué categorías declinaron, mostrar
el delta por categoría y señalar qué errores/warnings nuevos aparecieron. Una
tendencia no es un veredicto — es una hipótesis que el operador confirma con el
output crudo.

**Regla anti-fix:** el dashboard es de solo lectura. Si una categoría puntúa
abajo, el skill lista el output y prioriza recomendaciones por impacto (`peso *
(10 - score)`), pero NO arregla nada. Si el operador pide "arregla ya", se
responde con el dashboard primero; si lo rechaza, se documenta la decisión y se
marca `coverage_gap` en lugar de mutar el repo a ciegas. Diagnostica antes de
atacar — siempre.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git, commits, pushes, ni merges. Toda operación git queda detrás de
  confirmación explícita del operador.
- NO ejecuta tests, builds, installs ni comandos de CLI externos que muten el
  repo. La orientación es prosa para evaluación local; si las herramientas del
  proyecto se invocan, es solo lectura y el operador confirma primero.
- NO arregla, NO auto-fixea, NO aplica `--write` ni `--fix`. El dashboard es de
  solo lectura.
- NO abre conexiones de red. No publica. No despliega.
- NO invoca tooling de vendor (`npx gstack`, `${CLAUDE_PLUGIN_ROOT}`,
  sesiones, analytics, telemetría). Esos artefactos del referenciador se
  descartaron en la adaptación.
- NO auto-arranca remediación. Todo gate de ejecución (git, tests, commits,
  installs, deploys, fixes) queda detrás de confirmación explícita del operador.
- Si una dimensión no puede medirse por falta de herramienta o contexto, se
  marca `coverage_gap` y se salta — no se infiere ni se sustituye con una
  conjetura pulida.

El único entregable es el dashboard de salud en prosa, revisable por el operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-health/scripts/check-skill.mjs` verifica
  presencia de tokens de gobernabilidad, ausencia de APIs prohibidas y
  completitud del fixture negativo.
