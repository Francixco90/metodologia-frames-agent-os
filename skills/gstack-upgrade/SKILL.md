---
name: gstack-upgrade
description: This skill should be used when upgrading a toolchain or skill framework to its latest version, reviewing changelogs for breaking changes, or planning a gated upgrade procedure with rollback safety.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# gstack-upgrade — Procedimiento de upgrade de toolchain con puertas y rollback

## Cuándo invocar esta skill

Invócala cuando una toolchain, framework de skills o dependencia base del
repositorio deba llevarse a su última versión y el cambio no pueda aplicarse a
ciegas. La skill produce un procedimiento de upgrade **gated**: fija la versión
actual, revisa el changelog entre la versión instalada y la versión objetivo,
evalúa breaking changes, define un plan de aplicación por pasos y deja listo un
plan de rollback antes de tocar nada. Es la pieza opuesta a `install latest`
ejecutado a ciegas: en lugar de un comando único que muta el entorno, se
entrega un procedimiento auditable que el usuario debe aprobar paso a paso.

## Principio de la capability

La capability **no ejecuta comandos de instalación ni upgrade**. No invoca
package managers, no corre `setup`, no muta el repositorio, no toca el
manifiesto de versiones. Es una skill de **evaluación local**: lee la versión
actual, lee el changelog disponible y produce un procedimiento estructurado.
La ejecución de cada paso del procedimiento requiere confirmación explícita del
usuario antes de proceder.

### Por qué gated

Un upgrade de toolchain puede romper contratos, introducir breaking changes en
skills dependientes, invalidar fixtures o migrar formatos. El procedimiento
gated obliga a revisar antes de mutar: cada paso tiene una puerta de
confirmación, y la ausencia de confirmación en cualquier puerta detiene el
procedimiento completo. No hay upgrade parcial silencioso.

## El procedimiento de upgrade

El procedimiento tiene cinco fases. Las fases 1-4 son de evaluación y plan; la
fase 5 es de aplicación, y solo arranca cuando el usuario confirma el plan
completo.

### Fase 1 — Fijar versión actual

Antes de tocar nada, se registra la versión instalada con precisión. Sin
versión actual fijada, no se puede construir el delta del changelog ni el plan
de rollback. Se registra:

- Versión actual (del manifiesto, VERSION o lockfile).
- Versión objetivo (la última disponible).
- Tipo de instalación (global, vendored, lockfile).

Si la versión actual no puede determinarse, el procedimiento se detiene con un
`coverage_gap`: no se adivina la versión base.

### Fase 2 — Revisar changelog

Se lee el changelog entre la versión actual y la versión objetivo. Se agrupan
las entradas por tema (features, fixes, breaking changes, deprecations,
security). El objetivo no es listar todo el changelog: es identificar qué
cambios tocan superficies que el repositorio usa, y qué cambios son internos.

Se produce un resumen de 5-7 bullets agrupados por tema, priorizando cambios
que afectan al repositorio. Los cambios internos sin impacto en consumidor se
omiten salvo que sean significativos.

### Fase 3 — Evaluar breaking changes

Cada breaking change del changelog se cruza contra el repositorio: se
identifican los contratos, skills, fixtures o scripts que dependen de la
superficie afectada. Para cada breaking change se produce:

- Qué superficie cambia.
- Qué archivos del repositorio la usan.
- Qué migración se requiere (cambio de código, cambio de config, migración de
  datos).
- Severidad (bloqueante, requiere acción, informativo).

Si un breaking change es bloqueante y no tiene migración clara, el
procedimiento se detiene y se surfacea como desafío al usuario: el upgrade no
procede sin resolver el bloqueo.

### Fase 4 — Plan de aplicación gated

Se produce un plan de aplicación por pasos. Cada paso tiene:

- Acción a ejecutar (comando o secuencia de comandos).
- Verificación post-paso (qué debe pasar para considerar el paso exitoso).
- Puerta de confirmación (el usuario debe aprobar antes de ejecutar el paso).

El plan incluye explícitamente el orden de migraciones: si existen scripts de
migración entre la versión actual y la objetivo, se listan en orden, y cada
uno es un paso del plan con su propia puerta.

### Fase 5 — Plan de rollback

Antes de cualquier aplicación, se define el plan de rollback. El rollback
incluye:

- Cómo revertir a la versión anterior (backup, stash, lockfile previo).
- Cómo detectar que el upgrade falló (criterios de fallo: tests rotos, setup
  fallido, contratos inválidos).
- Cómo restaurar desde backup si `setup` o una migración falla.

Sin plan de rollback, el procedimiento no procede a la fase de aplicación.

## Límite de fail-closed

La skill **no ejecuta ningún comando de instalación o upgrade**. No corre
`setup`, no invoca package managers, no aplica migraciones, no muta el
manifiesto de versiones. El procedimiento se entrega como prosa auditable; la
ejecución de cada paso requiere confirmación explícita del usuario.

Si el usuario pide "upgrade ahora" sin pasar por las fases 1-4, la skill
responde con el procedimiento, no con la ejecución. Si el usuario confirma un
paso, solo ese paso se ejecuta; el siguiente paso requiere confirmación
separada. No hay `--yes` global, no hay auto-upgrade, no hay flag que desactive
las puertas.

No hay acceso a red, no hay fetch de versiones remotas, no hay clonado de
repositorios. La skill trabaja con el changelog y la versión disponibles
localmente; si falta información, marca `coverage_gap` en lugar de adivinar.

## Output

Un procedimiento de upgrade consolidado con:

- Versión actual y versión objetivo.
- Resumen del changelog (5-7 bullets por tema).
- Breaking changes con impacto en el repositorio (superficie, archivos
  afectados, migración, severidad).
- Plan de aplicación gated (pasos ordenados, verificación por paso, puerta por
  paso).
- Plan de rollback (reversión, detección de fallo, restauración).
- Bloqueos y `coverage_gap` detectados, si los hay.
- Puerta de aprobación final: aprobar el plan, modificarlo, o rechazar.

Derivada de gstack-upgrade (garrytan/gstack, MIT).
