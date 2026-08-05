---
name: dev-finishing-a-development-branch
description: This skill should be used when la implementación está completa y se necesita cerrar una rama de desarrollo — revisión final, limpieza, tests en verde, preparación de PR y merge readiness — sin auto-ejecutar git, commits, merges ni pushes; toda acción irreversible queda detrás de confirmación explícita del operador.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Finishing a Development Branch — cerrar una rama, método

El rol aquí es el de un ingeniero principal que llega al final de una rama de
desarrollo y la cierra de forma metódica. Cerrar no es fusionar: es verificar que
el árbol que se va a integrar está en verde, confirmar la base correcta,
presentar las opciones de integración al operador, ejecutar la elegida tras su
confirmación explícita y limpiar el espacio de trabajo una vez cerrada. Este
skill recorre el cierre en seis fases y entrega una decisión revisable. No
auto-ejecuta. No fusiona por iniciativa propia. No descarta trabajo sin orden
explícita.

La premisa es simple: una rama que no se verifica se integra mal. "Los tests
pasaron antes" no sirve — se corre la suite sobre el árbol que se va a
integrar—; "obvio quieren merge" no sirve — la decisión de integración es del
operador, se presenta el menú y se espera—; "ya terminé, borro la rama" no
sirve — el descarte solo ocurre ante orden explícita del operador. No se
adivina: si no se sabe la base, se pregunta; si la suite falla, se detiene; si
el operador no confirma, no se ejecuta nada irreversible.

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

## Las fases del cierre

El skill cierra la rama en seis fases. Cada fase produce un artefacto visible
que el operador revisa antes de avanzar.

1. **Verificar tests.** Correr la suite completa del proyecto en el árbol que
   se va a integrar. Si los tests fallan, reportar las fallas y detenerse — el
   menú de integración viene después de una suite en verde. Una run verde
   solo prueba el árbol sobre el que corrió; no se asume verde sobre el
   resultado mergeado. Declarar el comando ejecutado y el resultado.

2. **Detectar entorno.** Identificar el estado del repositorio: repo normal,
   worktree con rama con nombre, o detached HEAD. Esto determina qué opciones
   de integración se presentan y cómo se limpia el espacio. Para cada estado,
   declarar: ¿es repo normal o worktree? ¿La rama tiene nombre o es HEAD
   detachado? ¿Quién es dueño del workspace — el operador o la plataforma? Un
   entorno no declarado es un `coverage_gap`.

3. **Determinar la rama base.** La base es aquello de lo que se bifurcó esta
   rama — suele estar en el plan, en la conversación o en el upstream de la
   rama. Si no se sabe, preguntar al operador: "esta rama salió de <mejor
   conjetura>, ¿es correcto?". Confirmar antes de cualquier merge: fusionar
   contra la base equivocada es caro de deshacer. No se asume que la base es
   `main`.

4. **Presentar opciones.** Presentar el menú de integración tal cual está
   escrito — conciso, con cada opción de la lista. La decisión de integración
   es del operador; se espera su respuesta.

   Para repo normal y worktree con rama con nombre, presentar exactamente:
   (1) merge local contra la base, (2) push y crear Pull Request, (3) dejar la
   rama como está. Para detached HEAD, presentar exactamente: (1) push como
   rama nueva y crear Pull Request, (2) dejar como está. El descarte no se
   ofrece — solo ocurre ante pedido explícito del operador.

5. **Ejecutar la elección.** Ejecutar la opción que el operador confirme. Toda
   operación irreversible — checkout de la base, pull, merge, push, creación
   de PR, borrado de rama, limpieza de worktree — requiere confirmación
   explícita del operador antes de ejecutarse. Si el operador pide descartar,
   confirmar primero la lista exacta de lo que se perderá (rama, commits,
   worktree) y esperar la palabra `discard` del operador; solo entonces
   ejecutar el force-delete. Si el merge resulta en suite rota, detenerse,
   dejar rama y worktree en su lugar e investigar — nada se empujó, el merge
   es local y recuperable.

6. **Limpiar el workspace.** Corre para merge local confirmado y descarte
   confirmado. Si el workspace es del operador (`.worktrees/` o `worktrees/`),
   remover el worktree y podar registros. Si el workspace es gestionado por la
   plataforma, dejarlo en su lugar. Nunca limpiar worktrees ajenos que se ven
   "stale" — solo los que este skill creó.

**Regla anti-skip:** no se avanza de fase sin el artefacto de la fase anterior
revisado por el operador. Si el operador pide "salta al merge", se responde con
el estado parcial y se documentan los gaps; no se salta a fusionar sin verificar
tests ni confirmar la base. Cierra en orden — siempre.

## Errores comunes

| Excusa                                             | Realidad                                                                                                       |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| "Los tests pasaron antes en la sesión"             | Corre la suite sobre el árbol que vas a integrar. Una run verde solo prueba el árbol sobre el que corrió.      |
| "Obvio quieren el merge"                           | La integración es decisión del operador. Presenta el menú y espera.                                            |
| "Ya terminaron con el feature, ofrezco descartar"  | El menú está completo tal cual está. El descarte solo ocurre ante pedido explícito.                            |
| "'Ya, bórralo' cuenta como confirmación"           | Solo la palabra `discard` autoriza el borrado.                                                                 |
| "El PR ya está, el worktree sobra"                 | El feedback del PR se ataca en ese worktree. Se queda hasta que el trabajo aterrice.                           |
| "Ese otro worktree se ve viejo, lo limpio también" | Solo limpia worktrees bajo `.worktrees/` o `worktrees/`. El resto es del host.                                 |
| "El merge falló, seguro es flaky"                  | Un merge roto detiene todo. Rama y worktree se quedan mientras se investiga.                                   |
| "La base obvia es main"                            | Confirma el fork point o pregunta. Fusionar contra la base equivocada es caro de deshacer.                     |
| "El push fue rechazado, force-push lo arregla"     | Un push rechazado significa que el remoto movió. Investiga; force-push solo ante orden explícita del operador. |

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

Derivada de superpowers/finishing-a-development-branch (obra/superpowers, MIT).

## Lineage

- Referencia de método: `skills/vendor/superpowers/finishing-a-development-branch/SKILL.md`
- Contrato de creación: `core/contracts/creation-v3.ts`
- Modo: clean-room prose from permissive reference. Sin fragmentos de vendor.
