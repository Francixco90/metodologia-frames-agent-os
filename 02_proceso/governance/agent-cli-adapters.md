# Agent CLI adapters

Cómo adaptar el repositorio a distintos agent CLIs (Claude Code, Gemini CLI,
Cursor, Copilot CLI, Codex, afines) sin duplicar gobernanza. [CONFIG]

## Propósito

El repo tiene un núcleo de reglas CLI-agnóstico (`AGENTS.md`) y un router/gates
versionado en `02_proceso/governance/` + `05_verificacion/scripts/commands.yaml`.
Los agent CLIs cargan archivos de memoria con sintaxis distinta (Claude Code
soporta `@-import`; Gemini CLI no). Esta política define el set de adaptadores,
sus diferencias de sintaxis y el patrón para añadir un CLI nuevo — sin que la
gobernanza se duplique ni se filtre data personal. [CONFIG]

## Set de adaptadores (3 archivos raíz)

| Archivo     | CLI            | Sintaxis de import                       | Commiteado | Rol                                                                |
| ----------- | -------------- | ---------------------------------------- | ---------- | ------------------------------------------------------------------ |
| `AGENTS.md` | todos (núcleo) | n/a (fuente)                             | sí         | Reglas canónicas CLI-agnósticas (11 reglas + microperfiles).       |
| `CLAUDE.md` | Claude Code    | `@AGENTS.md` (import nativo)             | sí         | Cabina de Claude Code: loop + router resumen + G0-G3 + inbox dual. |
| `GEMINI.md` | Gemini CLI     | `[AGENTS.md](AGENTS.md)` (link markdown) | sí         | Cabina de Gemini CLI: mismo contrato, sintaxis nativa Gemini.      |

**Invariante**: `AGENTS.md` es la única fuente de reglas. Los adaptadores
apuntan a ella y a las fuentes versionadas; no duplican reglas. [CONFIG]

## Diferencias de sintaxis

| Aspecto                             | Claude Code (`CLAUDE.md`)                                          | Gemini CLI (`GEMINI.md`)                                 | Implicación                                                    |
| ----------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------- |
| Import de reglas                    | `@AGENTS.md` (inline al cargar)                                    | `[AGENTS.md](AGENTS.md)` (el agente debe seguir el link) | Gemini requiere paso extra de lectura; CLAUDE.md lo embebe.    |
| Archivo de memoria leído al iniciar | `CLAUDE.md`                                                        | `GEMINI.md` o `.gemini/`                                 | Si Gemini carga `.gemini/` primero, puntero ahí → `GEMINI.md`. |
| Tablas / listas                     | markdown estándar                                                  | markdown estándar                                        | Sin diferencia.                                                |
| Comandos `pnpm`                     | idénticos                                                          | idénticos                                                | Los gates son CLI-agnósticos.                                  |
| Datos personales                    | ninguno (viven en `CONTEXT.md`/`PROJECT.md`/`TASK.md`, gitignored) | ninguno                                                  | Los adaptadores commiteados no filtran PII.                    |

## Fuentes de gobernanza a las que apuntan los adaptadores

Los adaptadores **enlazan** estas fuentes; **no las duplican** (DRY). [CONFIG]

- Router de intención R0-R5: `02_proceso/governance/router.yml`
- Tool policy: `02_proceso/governance/tool-policy.yml`
- Gates → comandos (G00-G17): `05_verificacion/scripts/commands.yaml`
- Reconciliación SPEC 5 subsistemas ↔ harness-creator 7: `02_proceso/governance/harness-subsystem-reconciliation.md`
- Ownership: `01_intencion/program/ownership-manifest.yml` (governance/** → governance writer)
- Budget de docs: `02_proceso/governance/docs-budget-policy.yml` (`authored-governance-md` ≤400 líneas, enforce)

## Patrón para añadir un CLI nuevo (Cursor / Copilot CLI / Codex / afines)

1. **Confirmar soporte del CLI**: ¿qué archivo de memoria carga al iniciar
   (p. ej. Cursor → `.cursorrules` o `CURSOR.md`; Copilot → `.github/copilot-instructions.md`; Codex → `AGENTS.md` nativo)?
   ¿Soporta import/inline o solo links markdown?
2. **Crear `<CLI>.md`** en raíz (o la ruta canónica que el CLI espera), reflejando
   la estructura de `CLAUDE.md`/`GEMINI.md`: loop de atención, router resumen
   (puntero a `governance/router.yml`), gates (puntero a `commands.yaml`), inbox
   dual, task contract, G0-G3, evidence tags, estados, fail-closed, identidad
   MetodologIA, tono, antes-de-done. Usar la sintaxis de import nativa del CLI.
3. **Importar/enlazar `AGENTS.md`** con la sintaxis del CLI (no duplicar reglas).
4. **Añadir puntero** a este archivo (`agent-cli-adapters.md`) y a las fuentes
   versionadas de gobernanza.
5. **Añadir fila** a la tabla "Set de adaptadores" arriba + a la tabla de
   diferencias de sintaxis.
6. **Verificar**: `git check-ignore <CLI>.md` (vacío si debe commitearse);
   `pnpm check:md-budgets` (si el archivo debe excluirse del budget, añadirlo a
   `docs-budget-policy.yml` `exclusions`); `pnpm check:repo`; `pnpm verify:brand`;
   `npx prettier --write <CLI>.md`.
7. **Sin datos personales**: los adaptadores commiteados no contienen PII,
   secretos ni locators privados (esos viven en `CONTEXT.md`/`PROJECT.md`/
   `TASK.md`, gitignored). [CONFIG]
8. **Identidad**: MetodologIA es la única identidad visible en todo adaptador.
   No mezclar marcas. [CONFIG]

## Lo que los adaptadores NO hacen

- No duplican las 11 reglas de `AGENTS.md` (importan o enlazan).
- No duplican el router R0-R5 ni la tabla gate→comando (puntero a fuentes).
- No contienen datos personales, secretos ni chain-of-thought.
- No activan conectores ni publican (n8n dry-run; gates G13-G17 fail-closed).
- No mezclan marcas (MetodologIA-only). [CONFIG]

## Alternativas consideradas

- **A1 Un único `AGENTS.md` auto-suficiente sin adaptadores**: rechazado — los
  CLIs con sintaxis distinta (Gemini sin `@-import`) no pueden consumirlo como
  memoria de proyecto sin un wrapper de sintaxis nativa.
- **A2 Duplicar las reglas en cada adaptador**: rechazado — viola DRY; la deriva
  entre copias rompe la fuente versionada única (`AGENTS.md` + `governance/`).
- **A3 Solo sección en README, sin spec gobernado**: rechazado — sin hogar para
  el patrón "añadir un CLI nuevo"; el README crece sin governance.
- **A4 Adaptadores auto-documentados (solo cross-refs, sin este doc)**:
  rechazado — sin fuente central para la tabla de sintaxis y el patrón de
  extensión; cada nuevo CLI reinventaría el proceso.
- **Elegida: un spec gobernado (`agent-cli-adapters.md`, ≤400 líneas) +
  adaptadores con 1 línea de cross-ref cada uno + subsección en README**:
  fuente determinística única + discovery barato desde cada punto de entrada +
  ownership clara (governance/** → governance writer). [CONFIG]

## Referencias

- `AGENTS.md` — núcleo de reglas CLI-agnóstico.
- `CLAUDE.md` — adaptador Claude Code.
- `GEMINI.md` — adaptador Gemini CLI.
- `02_proceso/governance/router.yml` — router R0-R5.
- `05_verificacion/scripts/commands.yaml` — gates → comandos.
- `02_proceso/governance/harness-subsystem-reconciliation.md` — plantilla de
  spec de gobernanza con alternativas consideradas.
