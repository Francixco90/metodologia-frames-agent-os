# GEMINI.md — memoria del agente · metodologia-frames-agent-os

> **Lee [AGENTS.md](AGENTS.md) antes de editar.** Contiene las 11 reglas canónicas de agentes + microperfiles de eficiencia. GEMINI.md es la cabina de Gemini CLI (adaptador compartido, commiteado); AGENTS.md es el núcleo CLI-agnóstico.

Este archivo es la cabina de Gemini CLI (adaptador compartido, commiteado).
La fuente versionada vive en `02_proceso/governance/` + `05_verificacion/scripts/commands.yaml`.
Cómo adaptar el repo a otros agent CLIs (Claude Code, Cursor, etc.): `02_proceso/governance/agent-cli-adapters.md`. [CONFIG]

## Nota sintaxis Gemini

- Gemini CLI **no procesa `@-import`** de Claude Code. Las referencias a otros `.md` son enlaces markdown normales (p. ej. `[AGENTS.md](AGENTS.md)`).
- Si Gemini carga `.gemini/` antes que `GEMINI.md`, mantener un puntero en `.gemini/` a este archivo.
- El router de 4 rutas y los gates viven en fuentes versionadas (enlaces abajo), no duplicados aquí.

## Cómo operar aquí (loop de atención desde prompt #1)

1. **Iniciar sesión**: leer `GEMINI.md` (este) → [AGENTS.md](AGENTS.md) → `CONTEXT.md` → `PROJECT.md` → `TASK.md`.
2. **Clasificar intención** del prompt con el router de 4 rutas (abajo).
3. **Procesar input** (carpeta `inbox/` o attachment/prompt) → `source_id` + `raw_sha256` → registrar en `CONTEXT.md`.
4. **Ejecutar comando existente** del gate del DAG (NO inventar pipeline). Emitir receipt hash-bound.
5. **Actualizar** `TASK.md` + `CONTEXT.md` + `PROJECT.md`.
6. **Cerrar**: `node local/bin/check-inbox-coherence.mjs && pnpm check:repo`.

## Router + gates — fuente versionada

El router R0-R5 y la tabla gate→command viven en archivos versionados (no en esta cabina):

- Router: `02_proceso/governance/router.yml` (R0-R5, binds_to task/project/eval)
- Gates→comandos: `05_verificacion/scripts/commands.yaml` (G00-G17, manual fail-closed G13-G17)
- Tool policy: `02_proceso/governance/tool-policy.yml`
- Reconciliación SPEC 5 subsistemas ↔ harness-creator 7: `02_proceso/governance/harness-subsystem-reconciliation.md`

Esta cabina es el adaptador de Gemini CLI. Leer esas fuentes antes de editar. [CONFIG]

### Router de 4 rutas (resumen — fuente: `02_proceso/governance/router.yml`)

| Señal en prompt                                    | Ruta | Leer primero                                                        | Salida                                     |
| -------------------------------------------------- | ---- | ------------------------------------------------------------------- | ------------------------------------------ |
| "nuevo proyecto" / "crear proyecto"                | R1   | `01_intencion/program/dag.yml`, plantilla proyecto                  | `project.yml` + `claims-ledger.yml` vacíos |
| "retomar" / "continuar" / nombre proyecto conocido | R2   | `04_estado/registries/projects/project-registry.yml`, `project.yml` | estado + próximo gate                      |
| "tarea nueva" / "quiero X" + proyecto activo       | R3   | `TASK.md`, gate del DAG                                             | task-contract + receipt                    |
| "seguir" / "ongoing" / vacío + tarea en progreso   | R4   | `TASK.md` "En progreso"                                             | resume + receipt                           |
| Ambiguo                                            | R0   | `CONTEXT.md`                                                        | pedir dato bloqueante o `coverage_gap`     |

**Regla R0**: la instrucción actual manda. Sin proyecto, fuente o write-set claro, marca `coverage_gap` o pide dato bloqueante antes de editar. No adivines.

## Inbox dual — carpeta + attachments de prompt

El inbox es conceptual: carpeta física `inbox/` **o** attachments/peticiones en el prompt.

- **Carpeta `inbox/`**: contrato en `inbox/README.md`. Asignar `source_id`, conservar bytes, calcular `raw_sha256`, normalizar vía `04_estado/registries/sources/lifecycle-contract.yml`, emitir receipts append-only. Bloquear promoción sin procedencia/derechos/autoridad.
- **Attachment/prompt**: registrar en `CONTEXT.md` → Inputs efímeros como `ephemeral_input` (id, `raw_sha256` del contenido, origen, fecha). Promocionable a `inbox/` si el usuario quiere persistencia.

## Task contract (por tarea ejecutable)

Usar cuando una tarea tenga write-set, subagentes o cierre validado. [CONFIG]

| Campo        | Valor                     |
| ------------ | ------------------------- |
| Objetivo     | una frase                 |
| Repo         | repo_id                   |
| Responsable  | Lead / Support / Guardian |
| Inputs       | archivos o fuentes        |
| Write set    | rutas permitidas          |
| No objetivos | fuera de alcance          |
| Done         | criterio verificable      |
| Validación   | comando o revisión        |
| Gaps         | `coverage_gap` o none     |

**Regla**: sin write-set claro, no se edita. Sin validación, no se marca completo. [CONFIG]

## Checkpoints G0-G3

- **G0 antes de editar**: repo confirmado, reglas leídas, `git status` revisado, write-set declarado, cambios ajenos preservados, gaps marcados.
- **G1 contrato listo**: objetivo, inputs, no-objetivos, rutas lectura/escritura, done verificable declarados.
- **G2 antes de cerrar**: no hay escritura fuera del write-set, secretos, PII ni binarios no solicitados. Claims sustantivos con marca de evidencia.
- **G3 cierre**: validación ejecutada o gap declarado; archivos, riesgos y limitaciones listados.
- **Stop**: detente si falta write-set, la fuente requerida no existe, aparece un secreto, o la validación mutaría fuera del alcance. [CONFIG]

## Evidence tags

`[CÓDIGO]` `[CONFIG]` `[DOC]` `[INFERENCIA]` `[SUPUESTO]` o `coverage_gap` en toda decisión material.

Cadena de evidencia: claim → fuente → evidencia → limite → revisión. Un claim sin limite no está completo. Un claim sin fuente no puede marcarse `[DOC]`. [CONFIG]

## Estados no negociables

`RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED`.

Un build o render exitoso **nunca** concede `HUMAN_APPROVED`, `READY` ni `PUBLISHED`. El manifiesto vigente: `04_estado/registries/projects/project-registry.yml`. [CONFIG]

## Fail-closed

Una ausencia no se sustituye por una inferencia pulida. Marca `coverage_gap` explícito. Escalada > asunción. [CONFIG]

## Identidad

MetodologIA es la única identidad visible. No mezclar marcas. [CONFIG]

## Tono

Caveman off para deliverables humanos (contenido, docs para el equipo, PRs). Default: prosa terse. [CONFIG]

## Antes de marcar done

- `node local/bin/check-inbox-coherence.mjs` → `PASS G_INBOX`.
- `pnpm check:repo` → PASS sin regresión.
- `git status` → archivos locales no aparecen (CONTEXT/PROJECT/TASK gitignored; GEMINI.md commiteado).
