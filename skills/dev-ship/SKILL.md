---
name: dev-ship
description: This skill should be used when the operator requests a pre-ship release-readiness review — it walks a checklist across CHANGELOG and release notes, migration steps, rollback plan, feature flags, smoke tests, and stakeholder communication, and delivers prose findings plus a ship verdict for local evaluation only; it never auto-runs git, deploys, tests, or commits without operator confirmation.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Dev Ship — checklist pre-release

Derivada de ship/SKILL.md (garrytan/gstack, MIT).

`dev-ship` es una revisión de preparación pre-release. Antes de desplegar una feature, recorre seis dimensiones que evitan sorpresas en producción: changelog y release notes, pasos de migración, plan de rollback, feature flags, smoke tests y comunicación a stakeholders. La regla rectora es **no surprise deploys**: ningún despliegue debería sorprender a operadores, usuarios ni pares. El skill produce hallazgos en prosa y un veredicto de ship (`READY` / `NOT READY` / `BLOCKED`) para evaluación local. No ejecuta nada por su cuenta.

## Cuándo usar

- El operador pide una revisión pre-ship o release-readiness de una feature.
- El operador dice "¿está listo para subir?", "revisa antes de desplegar", "ship check", "¿qué falta para release?".
- Hay una feature completa en rama y se evalúa si puede promocionarse a producción.
- Antes de abrir un PR/MR de release cuando el equipo quiere una verificación previa de gobernanza.

No usar para: ejecutar el despliegue, correr tests, hacer commits, abrir PRs, o cualquier acción mutante. Esos quedan fuera del alcance y detrás de confirmación explícita del operador.

## Cómo

Recorrer en orden. Cada paso produce un hallazgo en prosa. Si una dimensión no aplica, marcarla como `N/A` con razón. Si no hay contexto de release suficiente, marcar `coverage_gap` y detener.

1. **CHANGELOG y release notes** — Verificar que existe una entrada de CHANGELOG para la versión, redactada para el público que la lee (usuarios, operadores, devs). Confirmar que los cambios visibles están listados, que los breaking changes están marcados, y que la fecha y la versión coinciden con el estado del repo. Si falta, anotar qué falta.

2. **Pasos de migración** — Identificar migraciones de base de datos, esquema o configuración que el cambio exige. Confirmar que están documentadas, ordenadas, y que existe su orden de aplicación respecto al despliegue. Verificar que son reversibles o que se acompañan de un plan de rollback. Si una migración es destructiva o no reversible, escalarla explícitamente.

3. **Plan de rollback** — Exigir un plan de rollback explícito antes de cualquier veredicto positivo. Debe responder: ¿cómo se revierte el cambio si falla en producción? ¿Hay feature flag para apagarlo en caliente? ¿La migración tiene un `down`? ¿Qué ventana de tiempo es segura para revertir? Un release sin plan de rollback no está listo, sin excepciones.

4. **Feature flags** — Confirmar si el cambio está detrás de un feature flag. Si lo está, verificar nombre, estado por defecto, y qué poblaciones lo reciben. Si no lo está, evaluar si el cambio es lo bastante pequeño o reversible para ir sin flag; si no, recomendar añadir uno antes de release.

5. **Smoke tests** — Confirmar qué smoke tests cubren el camino crítico del cambio tras el despliegue. Deben ser ejecutables, reproducibles, y saber distinguir el cambio activo del inactivo. Si no existen, anotar la brecha. No correrlos: el skill no ejecuta tests, solo verifica que están definidos.

6. **Comunicación a stakeholders** — Confirmar que existe un plan de comunicación: quién debe saber del release (operadores on-call, owners del producto, soporte), cuándo se les avisa, y por qué canal. Un release silencioso es una sorpresa evitable. Si no hay plan, marcarlo.

Después de los seis pasos, emitir un veredicto:

- `READY` — las seis dimensiones están cubiertas o marcadas `N/A` con razón.
- `NOT READY` — una o más dimensiones tienen brechas subsanables, listadas en el hallazgo.
- `BLOCKED` — falta contexto de release suficiente para evaluar; marcar `coverage_gap`.

El veredicto es orientación para el operador. No despliega, no abre PR, no commitea, no empuja. El operador decide el siguiente paso.

## Fail-closed

Este skill es `local-evaluation` y fail-closed por diseño:

- **NO** ejecuta git, commits, pushes, ni abre PRs.
- **NO** despliega a ningún entorno.
- **NO** corre tests, builds, ni migraciones.
- **NO** hace llamadas de red ni accede a APIs externas.
- **NO** escribe archivos mutantes ni muta estado del repo.
- Cualquier acción de ejecución queda detrás de confirmación explícita del operador. El skill solo produce prosa de revisión y un veredicto.

Una ausencia de contexto no se sustituye por una inferencia pulida. Se marca `coverage_gap` y se detiene.

## Validación

- `pnpm verify:skills` valida estructura, línea de gobierno y contratos del skill.
- `node skills/dev-ship/scripts/check-skill.mjs` verifica contratos locales (clean-room, fail-closed, tokens requeridos, fixtures).
- Si no hay contexto de release suficiente para evaluar una o más dimensiones, emitir `coverage_gap` en lugar de adivinar.
- `RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED`. Un veredicto `READY` de este skill no concede `HUMAN_APPROVED` ni `PUBLISHED`.