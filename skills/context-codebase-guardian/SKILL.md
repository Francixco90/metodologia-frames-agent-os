---
name: context-codebase-guardian
description: This skill should be used when the user wants to guard the codebase against drift, unreviewed changes, or contract violations by enforcing a persistent invariant layer over the repository.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Context Codebase Guardian — capa de invariantes persistentes

Un guardián que custodia el repositorio contra drift, cambios sin revisión y
violaciones de contrato. No reemplaza al type-checker, linter ni compiler del
proyecto: los invoca y les cree por encima de la inspección ocular. La idea
central es que una edición no termina cuando el diff se ve bien — termina
cuando el toolchain real está verde, la edición encaja con el codebase y todo
lo que dependía del comportamiento anterior quedó actualizado.

## Cuándo usarlo

Aplica ante cualquier edición no trivial a código existente: cambio de firma,
refactor estructural, renombrado cross-project, migración de convención,
ajuste de schema o contrato de API. Se omite para scripts desechables, archivos
nuevos en repo vacío o respuestas de una línea donde no hay nada que romper.

El skill opera en modo fail-closed y local-evaluation: sin write-set declarado
no se edita; sin validación ejecutada no se marca completo. Toda operación que
mute estado fuera del alcance (git, commits, deploys, red) queda detrás de
confirmación explícita del operador.

## Qué invariantes custodia

- **Toolchain verde** — type-check, lint, build y tests pasan antes y después
  de editar. El verde es la barra; una edición que no compila o que rompe
  tests no está completa.
- **Consistencia de patrón** — la edición es indistinguible en estilo del
  código circundante, salvo que el operador decida cambiar el patrón a
  propósito y lo documente. Una convención usada en todo el repo suele vencer
  a un patrón marginalmente mejor usado una sola vez.
- **Trazado de ripple** — todo símbolo tocado (firma, tipo, nombre exportado,
  clave de config, schema de DB, contrato de API) se rastrea a sus callers,
  tests, docs, configs y al otro lado de cualquier frontera de contrato. Los
  dependientes se buscan con grep, no se recuerdan.
- **Memoria durable** — convenciones, decisiones y trampas de ripple se
  registran para que la próxima sesión no las reaprenda. El codebase acumula
  su propio playbook.

## Cómo los hace valer

- **Fail-closed** — sin write-set claro no se edita. Sin validación ejecutada no
  se marca completo. Una ausencia no se sustituye por una inferencia pulida; se
  marca `coverage_gap` explícito y se escala antes de asumir.
- **Validar con herramientas, no con ojos** — se corre el type-checker, linter y
  compiler reales y se les cree sobre la intuición. Inspeccionar tipos a ojo es
  la fuente evitable de errores más grande.
- **Buscar dependientes, no recordar** — siempre se grep del símbolo cambiado
  en todo el repo antes de declarar la edición completa. La memoria miente; la
  búsqueda no.
- **No green-wash** — borrar un test que falla o aflojar un tipo para silenciar
  un error hace el problema invisible, no lo resuelve. Se dice qué está mal.
- **Confirmación del operador** — las decisiones arquitectónicas costosas de
  revertir (state management, layering, DI, contrato de API, estructura de
  carpetas) se preguntan antes de comprometerse cuando el codebase no las
  resuelve. No se asume en silencio.
- **Estado no negociable** — `RENDERED_DRAFT != FINAL != HUMAN_APPROVED !=
READY != PUBLISHED`. Un build verde nunca concede `HUMAN_APPROVED` ni
  `READY`.

## Cómo reporta drift

- **Baseline antes de editar** — se corre el toolchain antes de tocar para
  saber qué ya estaba rojo y separar señal de ruido tras la edición.
- **Comparación contra baseline** — los fallos nuevos son de la edición; los
  preexistentes se marcan pero no se heredan en silencio.
- **Receipt con límites** — cada cierre lista archivos tocados, riesgos,
  limitaciones, gaps y próximo gate. Un claim sin límite no está completo; un
  claim sin fuente no puede marcarse con evidencia.
- **coverage_gap explícito** — cuando falta contexto, fuente o write-set, se
  emite `coverage_gap` en lugar de fabricar una respuesta genérica o arreglar a
  ciegas. Escalada > asunción.

Derivada de codebase-guardian (DN-OpenSource/claude-skills, Apache-2.0).
