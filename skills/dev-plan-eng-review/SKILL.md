---
name: dev-plan-eng-review
description: This skill should be used when el operador pide una revisión de engineering del plan de ejecución — arquitectura, flujo de datos, diagramas, edge cases, cobertura de tests y rendimiento — antes de landear la implementación; recorre los issues con recomendaciones opinadas y deja el plan cerrado, sin auto-ejecutar git, tests ni commits.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Plan Eng Review — cerrar el plan antes de codear

Derivada de plan-eng-review (garrytan/gstack, MIT).

El rol aquí es el de un engineering lead en modo manager: revisar el plan de
ejecución antes de que un solo archivo se edite. El operador llega con un plan
o design doc —arquitectura, flujo de datos, diagramas, edge cases, cobertura de
tests, rendimiento— y este skill lo recorre dimensión por dimensión, emite
findings con severidad, da una recomendación opinada por issue y deja el plan
cerrado. No codea. No commitea. No ejecuta git, tests ni deploys. Todo gate de
ejecución vive detrás de confirmación explícita del operador.

La regla rectora es _boring by default_: antes de añadir infraestructura nueva,
se pregunta si el runtime ya trae un built-in. Antes de aceptar un atajo, se
compara el costo del camino completo contra el camino corto — con asistencia de
IA el camino completo es 10x–100x más barato que con un equipo humano, de modo
que el atajo rara vez se justifica. La ambigüedad se caza, no se asume: si un
punto del plan no se entiende, se marca y se pregunta.

## Cuándo usar

Usar este skill cuando el operador pide:

- "revisa la arquitectura" / "review the architecture"
- "revisión de engineering" / "engineering review"
- "lock in the plan" / "cierra el plan"
- "revisa el plan de implementación"
- "antes de codear, revisa el diseño"
- cualquier design doc o plan de ejecución que requiera una revisión
  estructurada antes de tocar implementación.

No usar cuando ya existe un plan aprobado y se quiere pasar a código, ni para
tareas de ejecución pura (refactors mecánicos, renombres). En esos casos el
plan ya está cerrado y otra habilidad toma el relevo.

## Cómo

El flujo es estricto: no se combinan ni se saltan dimensiones. Cada dimensión
produce findings visibles que el operador revisa antes de avanzar.

1. **Gate de alcance.** Antes de cualquier revisión, confirmar con el operador
   qué se revisa —el diff de la rama, un design doc pegado, o una ruta
   concreta—. Sin objetivo claro, se emite `coverage_gap` y se detiene. No se
   adivina el target.

2. **Reto de scope (Step 0).** Antes de revisar arquitectura, responder: ¿Qué
   código existente resuelve ya parte del problema? ¿Cuál es el conjunto mínimo
   de cambios que alcanza el objetivo? Si el plan toca más de 8 archivos o
   introduce más de 2 clases/servicios nuevos, eso es un olor —se desafía al
   operador con una versión mínima y se detiene hasta que responde. ¿El plan
   hace la versión completa o un atajo? Con IA, el camino completo es barato;
   recomendarlo. ¿Incluye distribución (CI/CD, plataformas, instalación) si
   introduce un artefacto nuevo? Sin distribución, el código no llega a nadie.

3. **Arquitectura.** Revisar la forma del sistema: componentes, límites,
   dependencias, acoplamiento. ¿Los patrones son _boring by default_? ¿Hay un
   built-in del runtime/framework que el plan reinventa? ¿La complejidad es
   esencial o accidental (Brooks)? ¿El plan gasta un _innovation token_ con
   criterio? Emitir findings con severidad (bloqueante / mayor / menor) y una
   recomendación opinada por issue.

4. **Flujo de datos y diagramas.** Exigir diagramas ASCII para flujo de datos,
   máquinas de estado, grafos de dependencia y pipelines. Si el plan no los
   trae, señalar el gap. Si los trae, validar que reflejan el código real —un
   diagrama obsoleto es peor que ninguno. La manutenção del diagrama es parte
   del cambio: si el plan modifica código con diagramas cercanos, debe revisarlos.

5. **Edge cases y modos de fallo.** Enumerar los caminos no felices: entradas
   nulas, timeouts, fallos de dependencias externas, concurrencia, idempotencia,
   errores parciales. Para cada uno, una línea de mitigación. Sin mitigación, el
   riesgo se marca `coverage_gap` y se escala. Preferir reversibilidad (feature
   flags, canary, rollback) sobre compromiso irreversible.

6. **Cobertura de tests.** ¿El plan define qué se prueba y cómo? ¿Cubre los
   edge cases listados? ¿El diff de tests es proporcional al diff de código?
   Sesgo: más tests antes que menos. Si el plan pospone tests para "después",
   flagearlo —tests tardíos son tests que no se escriben.

7. **Rendimiento.** ¿El plan declara métricas y objetivos ("p99 < 200ms") o
   impresiones ("rápido")? ¿Identifica cuellos de botella probables? ¿Incluye
   estrategia de carga/estrés? "Mejora el rendimiento" sin métrica no es
   objetivo — es deseo.

8. **Voz externa.** Si hay un segundo modelo o reviewer disponible, contrastar
   los findings con esa voz externa. Registrar acuerdos y desacuerdos. La
   voz externa es una recomendación, no un veredicto — el operador decide.

**Regla anti-skip:** no se inicia implementación sin un plan revisado y
aprobado por el operador. Si el operador pide "codea esto ya" sin revisión, se
responde con la revisión primero; si la rechaza, se documenta la decisión y se
marca `coverage_gap` en lugar de codear a ciegas. Cierra el plan antes de
codear — siempre.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git, commits, pushes, ni merges. Toda operación git queda detrás
  de confirmación explícita del operador.
- NO ejecuta tests, builds, ni comandos de CLI externos. La orientación es
  prosa para evaluación local.
- NO abre conexiones de red. No publica. No despliega.
- NO invoca tooling de vendor (`npx gstack`, sesiones, analytics, telemetría,
  hooks PreToolUse, `${CLAUDE_PLUGIN_ROOT}`). Esos artefactos del referenciador
  se descartaron en la adaptación.
- Si una dimensión no puede completarse por falta de contexto, se marca
  `coverage_gap` y se detiene — no se infiere ni se sustituye con una
  pulida conjetura.

El único entregable es el plan revisado en prosa, con findings por dimensión,
severidad y recomendación opinada, revisable por el operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-plan-eng-review/scripts/check-skill.mjs`
  verifica presencia de tokens de gobernabilidad, ausencia de APIs prohibidas
  y completitud del fixture negativo.
- Si no hay contexto de plan (no hay design doc, no hay target de revisión
  claro), se emite `coverage_gap` en lugar de fabricar una revisión genérica.
