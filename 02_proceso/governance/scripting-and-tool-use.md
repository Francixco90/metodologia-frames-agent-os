# Scripting and tool use

Contrato mínimo para scripts, wrappers y tool calls de Frames. Complementa
`tool-policy.yml`; no amplía tools, write sets, efectos ni autoridad. [METODOLOGIA][CONFIG]

## Decisión por defecto

1. Usa lectura directa para inspección y TypeScript para decisiones, validación y
   estado. Bash solo adapta entrada, entorno y proceso.
2. Ejecuta read-only o dry-run por defecto. `--apply` debe ser literal, visible y
   estar autorizado por el WorkOrder.
3. Pasa datos por stdin o por un archivo JSON validado. Nunca interpoles prompts,
   paths, URLs o contenido de usuario en una cadena de shell.
4. Invoca el ejecutable con argv explícito y `shell: false`; usa `--` antes de
   argumentos controlados por el usuario cuando el programa lo admita.
5. Si una garantía no puede comprobarse, devuelve `UNKNOWN/BLOCKED`; no la
   reemplaces por una advertencia. [METODOLOGIA][CONFIG]

## Contrato de entrada y salida

Un comando gobernado declara:

- schema y tamaño máximo de entrada;
- stdin, JSON o paths permitidos, nunca dos fuentes ambiguas;
- stdout estructurado para el resultado y stderr para diagnóstico sanitizado;
- códigos de salida `0=PASS`, `2=USAGE`, `3=BLOCKED`, `4=FAILED`;
- outputs esperados, effect class, gate y stop rule;
- timeout, cancelación, idempotencia y política de retry.

La entrada se valida antes de resolver paths o abrir tools. JSON desconocido,
duplicado, demasiado grande o con campos adicionales falla cerrado. Logs y
receipts guardan decisiones, hashes y evidencia; nunca chain-of-thought, secretos
ni el prompt completo cuando pueda contener PII. [METODOLOGIA][CONFIG]

## Ejecución segura

Patrón TypeScript:

```ts
spawn(executable, ['--input-json', '-', '--', userValue], {
  cwd: governedRoot,
  env: allowlistedEnv,
  shell: false,
  stdio: ['pipe', 'pipe', 'pipe'],
});
```

- `executable` y los flags provienen de un registry; el usuario solo aporta datos.
- No uses `exec`, `eval`, `sh -c`, backticks, sustitución de comandos ni
  `shell: true`.
- No dependas de aliases, perfiles interactivos, `PATH` mutable o directorios
  implícitos. Fija runtime, versión, cwd y variables mínimas.
- Deniega red por defecto. Un timeout no prueba que el proceso no dejó efectos;
  verifica el write set antes de reintentar.

Wrapper Bash permitido:

```bash
#!/usr/bin/env bash
set -euo pipefail
exec node --import tsx scripts/frames-assist.ts --input-json -
```

El wrapper no clasifica intención, no transforma JSON y no crea estado. Si necesita
más lógica, migra esa lógica al módulo tipado y cubierto por tests.

## Paths y write sets

1. Resuelve la raíz gobernada y cada parent existente con `realpath`.
2. Construye el destino desde segmentos validados; rechaza paths absolutos,
   `..`, NUL, separadores alternos, globs y nombres reservados.
3. Comprueba que el parent real está contenido en la raíz real, incluida la
   frontera de separador; un prefijo textual no basta.
4. Rechaza symlinks en inputs u outputs cuando el contrato no los autorice.
5. Captura snapshot pre/post y bloquea cualquier mutación fuera del write set.

Un path permitido no concede ownership. El WorkOrder debe resolver exactamente un
owner y el tool debe aparecer en su allowlist. [METODOLOGIA][CONFIG]

## Dry-run y persistencia

Dry-run ejecuta parsing, routing, autorización y preview en memoria, pero no:

- crea directorios o temporales persistentes;
- cambia estado, mtime, cachés, locks, receipts o registries;
- aplica formato, rebaseline o regeneración;
- llama conectores, red o subprocesses con efectos desconocidos.

Para una escritura autorizada:

1. Renderiza bytes deterministas en memoria.
2. Escribe un temporal único en el mismo filesystem y directorio gobernado.
3. Sincroniza, valida tamaño/schema y renombra atómicamente al destino.
4. Reabre el archivo final, calcula SHA-256 desde disco y compara los bytes.
5. Persiste el receipt solo después del read-back; una caída previa no acredita
   output ni ejecución.

Append-only exige lock o primitive atómica, detección de duplicado por clave
idempotente y read-back. Un archivo declarado pero inexistente nunca recibe hash.

## Efectos, gates y retries

| Effect class          | Comportamiento                                              |
| --------------------- | ----------------------------------------------------------- |
| `READ_ONLY`           | Sin mutaciones observables.                                 |
| `LOCAL_REVERSIBLE`    | Requiere write set, rollback y gate allowlisted.            |
| `EXTERNAL_REVERSIBLE` | Denegado salvo autorización específica y adapter promovido. |
| `IRREVERSIBLE`        | Denegado en este programa.                                  |

- Valida dependencias, estado, ownership, tools, effect class y gate antes de cada
  acción; no solo al comenzar el workflow.
- Retry requiere operación idempotente, misma entrada y ausencia comprobada de
  resultado válido. Máximo y backoff pertenecen al WorkOrder.
- Cancelación conserva el último candidate válido y emite estado verificable. No
  conviertas interrupción, timeout o salida parcial en `PASS`.
- Publicar, enviar, hacer upload, modificar conectores o aprobar gates humanos
  nunca es consecuencia implícita de `--apply`.

## Cierre verificable

Un handoff de script incluye executable/version, argv sanitizado, cwd portable,
WorkOrder, input/output hashes, archivos mutados, exit status, checks, efectos,
rollback y siguiente gate. Afirmar `executed` exige receipt material; configuración,
declaración YAML, stdout narrativo o UI visible solo prueban `planned` u `observed`.
[METODOLOGIA][CONFIG]
