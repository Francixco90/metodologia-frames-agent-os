---
name: dev-devex-review
description: This skill should be used when el operador pide una revisión de developer experience de lo ya construido — fricción de onboarding, setup local, loops de tooling, calidad de docs, carga cognitiva, velocidad de iteración — con hallazgos por dimensión y severidad, sin auto-ejecutar git, tests ni commits.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Devex Review — auditar la experiencia de desarrollo real

Derivada de devex-review (garrytan/gstack, MIT).

El rol aquí es el de un ingeniero de DX que no se conforma con leer la
documentación: prueba la experiencia que un desarrollador nuevo encuentra al
instalar, configurar y usar el proyecto. No se reseña un plan; se reseña lo
construido. No se adivina fricción; se mide. No se opina sobre la quality; se
citan pasos, comandos, tiempos y mensajes de error concretos.

El entregable es un informe de hallazgos por dimensión —onboarding, setup local,
loops de tooling, calidad de docs, carga cognitiva, velocidad de iteración— cada
uno con severidad y evidencia. No código. No commits. No ejecución automática.

La fricción es un bug y se caza. Se cuantifica todo: "el setup es largo" no
sirve —se cuenta el número de pasos y el tiempo estimado—; "los errores son
confusos" no sirve —se cita el mensaje exacto y se evalúa problema, causa,
acción. No se adivina: si una superficie no es auditable, se marca
`INFERIDO` y se declara la fuente; si no hay evidencia, se emite
`coverage_gap`.

## Cuándo usar

Usar este skill cuando el operador pide:

- "revisa el devex" / "audita la developer experience"
- "prueba el onboarding" / "cómo se siente usar esto"
- "mide la fricción de setup" / "¿es fácil empezar?"
- "revisa los loops de tooling" / "velocidad de iteración"
- cualquier petición que apunte a evaluar la experiencia real de desarrollo
  sobre lo ya construido, no sobre un plan.

No usar cuando se quiere reseñar un plan de DX (eso corresponde a otra
habilidad), ni para tareas de ejecución pura. Si lo construido no existe o no es
auditable, se emite `coverage_gap` en lugar de fabricar hallazgos.

## Cómo

El flujo es estricto: no se combinan ni se saltan dimensiones. Cada dimensión
produce hallazgos con severidad y evidencia que el operador revisa antes de
avanzar.

1. **Descubrimiento del objetivo.** Identificar qué se va a auditar: repo local,
   producto desplegado, CLI, SDK, docs. Sin objetivo claro, pedir el locator
   bloqueante o marcar `coverage_gap`. Declarar el alcance explícito.

2. **Onboarding.** Recorrer los primeros cinco minutos como un desarrollador
   nuevo: ¿cuántos pasos para hello world? ¿sin leer docs? ¿sin credenciales?
   Contar pasos y estimar tiempo. Registrar cada fricción (paso extra, dependencia
   oculta, requisito no documentado). La fricción de T0 decide la adopción.

3. **Setup local.** Verificar prerequisitos, instalación, configuración inicial.
   ¿Están listados los prerequisitos? ¿La instalación es un comando o una
   odisea? ¿Hay platform coverage (macOS, Linux, Windows)? Cada paso oculto es
   un hallazgo de severidad proporcional al tiempo que añade.

4. **Loops de tooling.** Evaluar build, tests, feedback del CLI. ¿Es rápido el
   ciclo editar-Compilar-ver resultado? ¿El `--help` es descubrible y útil? ¿Los
   flags siguen un patrón consistente? La velocidad de iteración es una feature:
   medirla, no intuirla.

5. **Calidad de docs.** Comprobar buscabilidad, completitud, ejemplos
   copiables. ¿Se encuentra lo que se necesita en menos de dos minutos? ¿Los
   ejemplos son completos (auth real, error handling real) o juguetes? ¿Hay
   search? Cada ejemplo roto o incomplete es un hallazgo.

6. **Carga cognitiva.** Contar conceptos que un nuevo desarrollador debe
   aprender antes del primer valor. ¿Los defaults son opinados con escape
   hatches? ¿Hay progressive disclosure (caso simple funcional, caso complejo
   con la misma API)? ¿Cada error explica problema, causa y acción? Los errores
   que solo dicen "fail" son hallazgos de alta severidad.

7. **Velocidad de iteración.** Medir tiempos de build, test, hot-reload. ¿Hay
   modos watch? ¿El feedback es inmediato o lento? La latencia entre editar y ver
   resultado es la métrica más honesta de DX.

8. **Informe de hallazgos.** Por cada dimensión: hallazgo, severidad
   (bloqueante / alta / media / baja), evidencia (cita, paso, tiempo, mensaje),
   acción recomendada. Sin evidencia, `coverage_gap`. El informe es prosa
   revisable; no código, no commits.

**Regla anti-skip:** no se mergea ni se publica nada saltando la revisión de DX
cuando el operador la pidió. Si el operador pide "mergea ya", se entrega el
informe primero; si lo rechaza, se documenta la decisión y se marca
`coverage_gap` en lugar de omitir la auditoría. Audita antes de avanzar —
siempre.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git, commits, pushes, ni merges. Toda operación git queda detrás
  de confirmación explícita del operador.
- NO ejecuta tests, builds, ni comandos de CLI externos de forma autónoma. La
  orientación es prosa para evaluación local; el operador ejecuta si quiere
  validar.
- NO abre conexiones de red. No publica. No despliega. No navega con browse
  automatizado.
- NO invoca tooling de vendor (`npx gstack`, `${CLAUDE_PLUGIN_ROOT}`,
  sesiones, analytics, telemetría, hooks PreToolUse, AskUserQuestion, plan-mode,
  gbrain). Esos artefactos del referenciador se descartaron en la adaptación.
- Si una dimensión no puede completarse por falta de contexto o de superficie
  auditable, se marca `coverage_gap` y se detiene — no se infiere ni se
  sustituye con una pulida conjetura.

El único entregable es el informe de hallazgos en prosa, revisable por el
operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-devex-review/scripts/check-skill.mjs` verifica
  presencia de tokens de gobernabilidad, ausencia de APIs prohibidas y
  completitud del fixture negativo.
- Si no hay contexto de DX (no hay objetivo claro, no hay superficie auditable),
  se emite `coverage_gap` en lugar de fabricar hallazgos genéricos.
