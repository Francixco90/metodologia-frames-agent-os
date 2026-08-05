---
name: dev-careful
description: This skill should be used when the operator faces a risky or irreversible change such as force-push, destructive migration, production config, or deletion — it enforces a careful-mode discipline of risk identification, dry-run, blast-radius verification, and explicit operator confirmation before any action, and delivers prose guidance for local evaluation only; it never auto-runs git, tests, or commits without operator confirmation.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Dev Careful — modo alta precaución

Derivada de careful/SKILL.md (garrytan/gstack, MIT).

`dev-careful` es el modo alta precaución de MetodologIA para cambios riesgosos
o irreversibles. No es un hook, no es un wrapper de bash, no escribe a disco
por sí mismo. Es una disciplina de evaluación local que el operador sigue antes
de autorizar cualquier acción destructiva: force-push, migración destructiva,
configuración de producción, borrado recursivo, reset --hard, eliminación de
recursos. Toda ejecución queda tras la confirmación explícita del operador —
fail-closed por diseño.

## Cuándo usar

Activar cuando el operador enfrente cualquiera de estas señales:

- `git push --force` / `git push -f` / `git reset --hard` — reescritura de historia.
- `DROP TABLE` / `DROP DATABASE` / `TRUNCATE` — pérdida de datos.
- `rm -rf` / `rm -r` / borrado recursivo sobre rutas no descartables.
- `kubectl delete` / `docker rm -f` / `docker system prune` — impacto en runtime.
- Migración destructiva de esquema (columna eliminada, tipo alterado sin backfill).
- Cambio de configuración de producción (secrets, variables de entorno, flags).
- Cualquier operación donde el operador diga "ten cuidado", "modo producción",
  "cuidado con esto", o donde el write-set incluya rutas irreversibles.

Si el cambio es reversible y local (editar un archivo de borrador, agregar tests),
el modo careful es innecesario. La regla: si el costo de revertir es alto o
incierto, activar careful.

## Cómo

La disciplina son cinco pasos, en orden, sin saltarse ninguno. Cada paso entrega
prosa que el operador evalúa localmente; el skill no ejecuta nada por sí mismo.

1. **Identificar riesgo.** Nombrar la operación concreta, su clase de riesgo
   (pérdida de datos, reescritura de historia, impacto en producción, borrado
   irreversible) y su grado de reversibilidad. Un riesgo no nombrado es un riesgo
   no gestionado. Si no puedes nombrar la clase, marca `coverage_gap` y pide al
   operador que la declare antes de avanzar.

2. **Dry-run primero.** Antes de cualquier acción, proponer el comando o
   mutación en modo de lectura o simulación: `--dry-run`, `--no-act`, plan de
   migración aplicado sobre una copia, `git diff` del resultado esperado, dump
   del schema resultante. El dry-run debe ser observable por el operador. Si la
   herramienta no ofrece modo dry-run, simular la mínima expresión posible y
   declarar esa limitación.

3. **Verificar blast radius.** Declarar qué queda afectado: qué archivos, qué
   ramas, qué tablas, qué entornos, qué usuarios, qué dependientes. El blast
   radius es la frontera de daño. Si la frontera no puede delimitarse, no
   avanzar — marca `coverage_gap` y escala. Un blast radius implícito ("solo
   esto") no cuenta; debe enumerarse.

4. **Confirmación explícita del operador.** Ningún paso destructivo se ejecuta
   sin confirmación explícita del operador humano. La confirmación debe ser
   afirmativa e informada: el operador vio el dry-run, vio el blast radius, y
   dice "procede" (o equivalente). El silencio no es consentimiento. Una
   inferencia de intención no es consentimiento. Esto es fail-closed.

5. **Verificar.** Tras la acción, confirmar el resultado observable contra el
   dry-run: estado del repo, schema, logs, diff resultante. Si el resultado
   difiere de la predicción, detener y declarar el desvío antes de seguir.

## Fail-closed

`dev-careful` es local-evaluation solamente. No ejecuta nada por sí mismo:

- NO auto-ejecuta `git`, `git push`, `git reset`, ni ningún comando destructivo.
- NO hace force-push. Nunca. La confirmación del operador no delega ejecución al
  skill; el operador ejecuta, el skill asesora.
- NO corre tests, NO hace commits, NO publica, NO toca red.
- NO invoca hooks, NO escribe a `~/.gstack` ni a ningún directorio de usuario.
- NO referencia `${CLAUDE_SKILL_DIR}`, gbrain, ni tooling del vendor. El
  homólogo se sostiene solo con evaluación local.
- Sin confirmación explícita del operador, la respuesta por defecto es no-op.
  Una ausencia de confirmación no se sustituye por una inferencia pulida —
  marca `coverage_gap` explícito. Escalada > asunción.

## Validación

- `pnpm verify:skills` — gate del repo para skills gobernados.
- `node skills/dev-careful/scripts/check-skill.mjs` — checker local del
  contrato del skill (recursos gobernados, clean-room, fail-closed, sin APIs
  prohibidas, sin rutas absolutas de usuario).
- Si un claim no puede verificarse con evidencia local, marcar `coverage_gap`
  antes de marcar done.
