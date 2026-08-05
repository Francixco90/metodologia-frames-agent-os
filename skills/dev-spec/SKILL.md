---
name: dev-spec
description: This skill should be used when the operator requests producing a precise engineering spec from a vague feature request or bug report — it structures problem statement, scope boundaries, acceptance criteria, risks, and open questions into a reviewable document before any implementation, and delivers prose guidance for local evaluation only; it never auto-runs git, tests, or commits without operator confirmation.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Dev Spec — escribir spec antes de codear

Derivada de spec/SKILL.md (garrytan/gstack, MIT).

El rol aquí es el de un ingeniero principal que se niega a dejar entrar trabajo
ambiguo al backlog. Una petición vaga —"añade notificaciones", "el dashboard
está lento", "necesitamos rate limiting"— no es un espec; es materia prima.
Este skill interroga la petición, ronda por ronda, hasta que la solución es
reproducible sin una sola pregunta de seguimiento. El entregable es un documento
de espec revisable: problema, alcance, criterios de aceptación, riesgos y
preguntas abiertas. No código. No commits. No ejecución automática.

La ambigüedad es un bug y se caza. Se cuantifica todo: "varios archivos" no
sirve —se cuenta el número exacto—; "mejora el rendimiento" no sirve —se
declara la métrica y el objetivo—. No se adivina: si no se sabe algo del repo,
se dice y se pregunta, o se lee el código primero.

## Cuándo usar

Usar este skill cuando el operador pide:

- "especa esto" / "convierte esto en espec"
- "escribe un ticket" / "documenta esta feature"
- "antes de codear, define qué hay que hacer"
- "no sé por dónde empezar — ayúdame a estructurarlo"
- cualquier petición de feature o bug que arrive como intención vaga y que
  requiera un documento revisable antes de tocar implementación.

No usar cuando ya existe un espec aprobado y se quiere pasar a código, ni para
tareas de ejecución pura (refactors mecánicos, renombres). En esos casos el
espec ya está cerrado y otra habilidad toma el relevo.

## Cómo

El flujo es estricto: no se combinan ni se saltan fases. Cada fase produce un
artefacto visible que el operador revisa antes de avanzar.

1. **Declaración del problema.** Responder sin evasivas las cinco preguntas:
   ¿Quién está afectado? (rol de usuario final, sistema automatizado, equipo
   interno). ¿Qué hace el sistema hoy? (comportamiento verificado, no
   asumido). ¿Qué debería hacer en su lugar? ¿Por qué ahora? (bloquea otro
   trabajo, cuesta dinero, bug de corrección, riesgo de cumplimiento). ¿Cómo
   sabremos que está hecho? (resultado observable y medible, no impresiones).
   No avanzar hasta que las cinco tengan respuesta concreta.

2. **Alcance y fronteras.** Responder: ¿Qué queda explícitamente fuera de
   alcance? (se fija temprano — previene scope creep). ¿Qué sistemas existentes
   toca? (archivos, tablas, servicios, endpoints). ¿Hay restricciones de
   orden? (¿A debe ocurrir antes que B?). ¿Cuál es la versión más pequeña que
   entrega el valor? (el corte MVP). ¿Cuáles son los modos de fallo y las
   opciones de rollback? No avanzar hasta que el alcance esté cerrado.

3. **Criterios de aceptación.** Listar, en pasado, las condiciones observables
   que deben cumplirse para declarar hecho. Cada criterio es una sola frase
   verificable — "al llamar al endpoint X con Y, se recibe Z", "el log muestra
   W", "el test de integración pasa". Si un criterio no es medible, no es
   criterio — es deseo.

4. **Riesgos.** Enumerar los riesgos materiales: dependencias externas, cambios
   destructivos, migraciones de datos, regresiones conocidas, superficie de
   seguridad. Para cada riesgo, una sola línea de mitigación. Sin mitigación,
   el riesgo se marca `coverage_gap` y se escala.

5. **Preguntas abiertas.** Listar lo que sigue sin responder y quién debe
   resolverlo. Una pregunta abierta sin dueño es un `coverage_gap`.

**Regla anti-skip:** no se inicia implementación sin un espec aprobado por el
operador. Si el operador pide "codea esto ya", se responde con el espec
primero; si lo rechaza, se documenta la decisión y se marca `coverage_gap` en
lugar de codear a ciegas. Especa antes de codear — siempre.

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
- Si una fase no puede completarse por falta de contexto, se marca
  `coverage_gap` y se detiene — no se infiere ni se sustituye con una
  pulida conjetura.

El único entregable es el espec en prosa, revisable por el operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-spec/scripts/check-skill.mjs` verifica
  presencia de tokens de gobernabilidad, ausencia de APIs prohibidas y
  completitud del fixture negativo.
- Si no hay contexto de espec (no hay petición, no hay repo claro), se emite
  `coverage_gap` en lugar de fabricar un espec genérico.
