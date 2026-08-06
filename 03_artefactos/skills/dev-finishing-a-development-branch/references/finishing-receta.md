# Receta — Cerrar una rama de desarrollo (seis fases + errores comunes)

Receta governed, hash-bound. Load antes de cerrar una rama. El SKILL.md es el
router; este archivo es el detalle operativo. No auto-ejecuta git; toda
operación irreversible queda detrás de confirmación explícita del operador.

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