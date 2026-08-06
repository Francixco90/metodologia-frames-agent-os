---
name: dev-finishing-a-development-branch
description: This skill should be used when la implementación está completa y se necesita cerrar una rama de desarrollo — revisión final, limpieza, tests en verde, preparación de PR y merge readiness — sin auto-ejecutar git, commits, merges ni pushes; toda acción irreversible queda detrás de confirmación explícita del operador.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Finishing a Development Branch — cerrar una rama, método

El rol aquí es el de un ingeniero principal que llega al final de una rama de
desarrollo y la cierra de forma metódica. Cerrar no es fusionar: es verificar
que el árbol que se va a integrar está en verde, confirmar la base correcta,
presentar las opciones de integración al operador, ejecutar la elegida tras su
confirmación explícita y limpiar el espacio de trabajo una vez cerrada. Este
skill recorre el cierre en seis fases y entrega una decisión revisable. No
auto-ejecuta. No fusiona por iniciativa propia. No descarta trabajo sin orden
explícita.

La premisa: una rama que no se verifica se integra mal. "Los tests pasaron
antes" no sirve — se corre la suite sobre el árbol que se va a integrar—;
"obvio quieren merge" no sirve — la decisión de integración es del operador,
se presenta el menú y se espera—; "ya terminé, borro la rama" no sirve — el
descarte solo ocurre ante orden explícita del operador. No se adivina: si no se
sabe la base, se pregunta; si la suite falla, se detiene; si el operador no
confirma, no se ejecuta nada irreversible.

Derivada de superpowers/finishing-a-development-branch (obra/superpowers, MIT).

## Cuándo usar

Usar este skill cuando el operador pide:

- "terminé esta rama" / "cierra esta rama" / "ya está listo el feature"
- "merge esto" / "prepara el PR" / "integra el trabajo"
- "qué hago ahora que terminé de implementar"
- "revisa la rama antes de mergear"
- cualquier rama de desarrollo cuyo trabajo está completo y el operador quiere
  cerrar de forma metódica antes de integrarla.

No usar cuando la implementación aún no termina (ahí toca `dev-executing-plans`
o `dev-test-driven-development`), ni cuando se investiga un bug en la rama (ahí
toca `dev-investigate`). En esos casos otra habilidad toma el relevo.

## Receta — router

La receta completa (las seis fases del cierre con su artefacto visible por
fase, la regla anti-skip y la tabla de errores comunes) lives en
`references/finishing-receta.md` (governed, hash-bound). Load la receta antes
de ejecutar el cierre.

| Sección                    | Where en receta                                          |
| -------------------------- | -------------------------------------------------------- |
| Las seis fases del cierre  | `references/finishing-receta.md` § Las fases del cierre  |
| Regla anti-skip            | `references/finishing-receta.md` § Las fases del cierre  |
| Errores comunes (tabla)    | `references/finishing-receta.md` § Errores comunes       |

Resumen ejecutivo: (1) verificar tests sobre el árbol a integrar, (2) detectar
entorno repo/worktree/detached, (3) confirmar la rama base — nunca asumir
`main`, (4) presentar el menú de integración tal cual está, (5) ejecutar la
opción confirmada — toda operación irreversible requiere confirmación
explícita; el descarte exige la palabra `discard`, (6) limpiar el workspace
solo si es del operador y solo tras merge o descarte confirmados.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git, commits, pushes, ni merges por iniciativa propia. Toda
  operación git queda detrás de confirmación explícita del operador.
- NO fuerza-push, no borra ramas ni remueve worktrees sin la palabra `discard`
  del operador o la confirmación explícita del paso correspondiente.
- NO abre conexiones de red, no publica, no despliega. El push, cuando el
  operador lo confirma, es la única operación que toca el remoto.
- NO invoca tooling de vendor (hooks, analytics, telemetría, mockup
  generators, sessions `${CLAUDE_PLUGIN_ROOT}`). Esos artefactos del
  referenciador se descartaron en la adaptación.
- NO auto-arranca installs, tests en staging, deploys ni comandos con side
  effects. Todo gate de ejecución (git, tests, installs, deploys) queda
  detrás de confirmación explícita del operador.
- Si una fase no puede completarse por falta de contexto o de acceso al repo,
  se marca `coverage_gap` y se detiene — no se infiere ni se sustituye con una
  pulida conjetura.

El único entregable es la decisión de cierre, revisable por el operador, y la
ejecución de la opción que este confirme.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-finishing-a-development-branch/scripts/check-skill.mjs`
  verifica presencia de tokens de gobernabilidad, ausencia de APIs prohibidas y
  completitud del fixture negativo.
- Si no hay contexto de cierre (no hay rama declarada, no hay base confirmable,
  no hay suite accesible), se emite `coverage_gap` en lugar de fabricar un
  cierre genérico.

## Lineage

- Referencia de método: `skills/vendor/superpowers/finishing-a-development-branch/SKILL.md`
- Contrato de creación: `core/contracts/creation-v3.ts`
- Modo: clean-room prose from permissive reference. Sin fragmentos de vendor.