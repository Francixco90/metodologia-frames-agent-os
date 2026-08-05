---
name: dev-land-and-deploy
description: This skill should be used when el operador pide aterrizar una rama y secuenciar su despliegue — elegir la estrategia de merge, correr los pre-checks de readiness, ordenar el despliegue y planear la verificación post-deploy — sin auto-ejecutar git, merge, push ni deploy.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Land and Deploy — aterrizar una rama y secuenciar su despliegue

El rol aquí es el de un ingeniero de entregas que recibe una rama lista y
planifica cómo aterrizarla y desplegarla sin romper producción. Aterrizar no es
apretar un botón: es elegir la estrategia de merge, verificar que el PR está
listo, ordenar los pasos del despliegue y planear cómo se confirma que la
salida está sana. Este skill describe la secuencia completa en prosa, deja que
el operador la revise y detiene toda ejecución detrás de su confirmación
explícita. No merges. No pushes. No deploys automáticos. El operador decide
cuándo avanzar; el skill describe cómo.

La premisa es simple: un aterrizaje que no se secuencia se rompe en producción.
"merge ya" no sirve — se declara la estrategia (squash, merge, rebase) y el
gate que la condiciona—; "CI verde" no sirve — se lista qué checks pasaron y
cuáles bloquean—; "deploy y ya" no sirve — se ordena el despliegue y se planea
la verificación. No se adivina: si no se sabe algo del estado del PR o del
entorno, se dice y se pregunta, o se lee el contexto primero.

## Cuándo usar

Usar este skill cuando el operador pide:

- "aterriza esta rama" / "land the PR"
- "merge y deploy" / "land and deploy"
- "despliega esto a producción" / "ship it to production"
- "revisa si el PR está listo para merge"
- cualquier rama con PR abierto que el operador quiere aterrizar y desplegar.

No usar cuando aún no hay PR (ahí toca crearlo primero), ni cuando el deploy ya
ocurrió y lo que se necesita es monitoreo extendido o rollback en curso. En
esos casos otra habilidad toma el relevo.

## Las fases del aterrizaje y despliegue

El skill describe el aterrizaje a lo largo de cinco fases. Cada fase produce un
artefacto visible —una secuencia, un reporte de readiness, un plan de deploy—
que el operador revisa antes de avanzar. Ninguna fase se auto-ejecuta.

1. **Pre-flight del PR.** Identificar el PR a aterrizar: número, título, rama
   origen, rama base. Validar el estado: si está `MERGED` no hay nada que
   aterrizar; si está `CLOSED` sin mergeear, hay que reabrirlo; si está `OPEN`
   se continúa. Detectar la plataforma de hosting (GitHub, GitLab) y la rama
   base del repo. Si no hay PR para la rama actual, se declara `coverage_gap` y
   se detiene —no se inventa un PR ni se hace merge a ciegas.

2. **Pre-checks de merge.** Antes de mergeear, verificar tres frentes:
   - **CI**: ¿los checks requeridos pasaron? Si están pendientes, declarar que
     se espera. Si fallan, listar los checks rotos y bloquear —no se mergeea
     código que no pasó CI.
   - **Conflictos**: ¿el PR tiene conflictos con la base? Si los tiene, bloquear
     —el operador debe resolverlos y re-pushar.
   - **Drift de versión**: si el repo lleva VERSION/CHANGELOG, verificar que el
     slot del PR no fue ocupado por otro aterrizaje paralelo. Si el slot está
     stale, bloquear y pedir re-sync desde la rama feature.

   Cada check produce un veredicto `PASS`, `BLOCK` o `WAIT`. Un `BLOCK` detiene
   la fase; el operador resuelve y vuelve a invocar el skill.

3. **Gate de readiness pre-merge.** Antes de un merge irreversible, reunir
   evidencia de readiness y armar un reporte que el operador aprueba:
   - **Reviews**: ¿hubo review de ingeniería? ¿está CURRENT o STALE (N commits
     desde el review)? Si está STALE o NOT RUN, ofrecer un review rápido inline
     antes de avanzar —los deploys son irreversibles.
   - **Tests**: ¿los tests locales pasan? ¿hay resultados de E2E recientes? Si
     los tests fallan, es bloqueador.
   - **Cuerpo del PR**: ¿el body refleja los commits actuales, o quedó stale?
     Si está desactualizado, marcar warning.
   - **Docs y changelog**: si el diff incluye features nuevas y CHANGELOG/VERSION
     no se tocaron, marcar warning —`/document-release` probablemente no se
     corrió.

   El reporte lista warnings y blockers. Si hay blockers, no se avanza. Si hay
   warnings, el operador decide si proceder, fixear primero o saltar con
   confirmación explícita. **El merge no ocurre aquí** —el skill describe el
   reporte y se detiene; el operador confirma antes de cualquier operación git.

4. **Estrategia de merge y despliegue.** Declarar la secuencia exacta:
   - **Método de merge**: squash / merge / rebase —auto-detectado de la config
     del repo, no adivinado. Si el repo tiene merge queues, declarar que el PR
     entrará en cola y que CI correrá una vez más sobre el commit final.
   - **Detección de deploy**: ¿hay workflow de deploy disparado por el merge?
     ¿hay CLI de plataforma (Fly, Render, Heroku, Vercel, Netlify)? ¿hay staging
     detectado? Si hay staging, ofrecer la ruta staging-first (verificar ahí
     antes de producción).
   - **Sequencing del deploy**: si el deploy es automático en merge, declarar
     que se espera propagación (~60s) y luego se verifica. Si el deploy es por
     workflow, declarar que se monitorea el run. Si no hay workflow ni URL, no
     se fabrica verificación —se declara `coverage_gap`.

   La estrategia se entrega como un plan en prosa, no como comandos ejecutados.
   El operador revisa y confirma antes de cualquier merge.

5. **Verificación post-deploy y plan de revert.** Después del deploy (que el
   operador ejecuta, no el skill), planear cómo verificar la salud:
   - **Profundidad por scope**: docs-only → nada que verificar; config-only →
     smoke de status; backend → errores de consola + perf; frontend → canary
     completo (status, console, perf, contenido, screenshot).
   - **Health checks**: page loads 200, sin errores críticos de consola, contenido
     real (no página en blanco), load time bajo el umbral.
   - **Plan de revert**: si la verificación falla, declarar los pasos del revert
     (fetch base, checkout base, revert del merge SHA, push) y ofrecerlo como
     escape hatch. El revert también queda detrás de confirmación explícita.

   El skill describe el plan de verificación; el operador lo ejecuta y reporta
   los hallazgos. Si algo falla, el skill describe el plan de revert —no lo
   ejecuta.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git, merges, pushes, fetches ni deploys. Toda operación git y
  deploy queda detrás de confirmación explícita del operador.
- NO ejecuta tests, builds, ni comandos de CLI externos. La orientación es
  prosa para evaluación local.
- NO abre conexiones de red. No publica. No despliega. No hace `gh`, `fly`,
  `vercel`, `heroku`, `curl` ni ningún comando de plataforma.
- NO invoca tooling de vendor (`npx gstack`, `${CLAUDE_PLUGIN_ROOT}`,
  sesiones, analytics, telemetría, mockup generators, hooks, AskUserQuestion,
  plan-mode gates). Esos artefactos del referenciador se descartaron en la
  adaptación.
- NO auto-mergea ni auto-deploya. Todo gate de merge y deploy queda detrás de
  confirmación explícita del operador. Un PR `ready` no es un PR `merged` —
  la confirmación explícita del operador es el gate que falta.
- Si una fase no puede completarse por falta de contexto, se marca
  `coverage_gap` y se detiene —no se infiere ni se sustituye con una pulida
  conjetura.

El único entregable es la secuencia de aterrizaje y despliegue en prosa,
revisable por el operador.

Derivada de land-and-deploy (garrytan/gstack, MIT).

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-land-and-deploy/scripts/check-skill.mjs`
  verifica presencia de tokens de gobernabilidad, ausencia de APIs prohibidas y
  completitud del fixture negativo.
- Si no hay contexto de PR (no hay PR abierto, no hay rama base clara), se
  emite `coverage_gap` en lugar de fabricar una secuencia genérica.
