# Video OS — Claude Code adapter

Este sistema convierte intención en resultados por procesos auto orquestado.

Project harness for reliable agent-assisted development.

> Invariantes no negociables (estados, gates, fail-closed, evidence tags, profundidad ≤ 4, identidad MetodologIA) en [CONSTITUTION.md](CONSTITUTION.md). Esta plantilla solo añade el contrato de entrada para Claude Code.

## Supuestos

- Claude Code carga este archivo como memoria de proyecto al iniciar sesión.
- Frames enruta solicitudes de video por R6; Video OS selecciona el arquetipo V00–V04.
- Los gates manuales (G13–G17) no se automatizan; se documentan como bloqueados.

## Alternativas consideradas

- **Router único sin R0**: rechazado — la ambigüedad sin write-set produce escritura fuera de alcance.
- **Gates automáticos para todo**: rechazado — viola fail-closed en gates de gobernanza.
- **Router de 4 rutas con R0 explícito**: elegido — escalada > asunción.

## Router de 4 rutas

| Señal en prompt                                    | Ruta | Leer primero                                                            | Comando                                   | Salida                                     |
| -------------------------------------------------- | ---- | ----------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------ |
| "nuevo proyecto" / "crear proyecto"                | R1   | `01_intencion/program/dag.yml`, `projects/_template/project.yml`        | scaffold `projects/<id>/` + verificación  | `project.yml` + `claims-ledger.yml` vacíos |
| "retomar" / "continuar" / nombre proyecto conocido | R2   | `registries/projects/project-registry.yml`, `projects/<id>/project.yml` | gate vigente del `project.yml`            | estado + próximo gate                      |
| "tarea nueva" / "quiero X" + proyecto activo       | R3   | `TASK.md`, gate del DAG                                                 | comando del gate (ver tabla gate→comando) | task-contract + receipt                    |
| "seguir" / "ongoing" / vacío + tarea en progreso   | R4   | `TASK.md` "En progreso"                                                 | comando pendiente                         | resume + receipt                           |
| Ambiguo                                            | R0   | `CONTEXT.md`                                                            | —                                         | pedir dato bloqueante o `coverage_gap`     |

**Regla R0**: la instrucción actual manda. Sin proyecto, fuente o write-set claro, marca `coverage_gap` o pide dato bloqueante antes de editar. No adivines.

## Tabla gate → comando

| Gate                          | Comando                                                              |
| ----------------------------- | -------------------------------------------------------------------- |
| G00 toolchain                 | `pnpm check:toolchain`                                               |
| G04 repo / G01-G09 estructura | `pnpm check:repo`                                                    |
| G02 sources                   | `pnpm check:sources`                                                 |
| G03 brand                     | `pnpm check:brand`                                                   |
| G07 skills                    | `pnpm verify:skills`                                                 |
| G08 core contracts            | `pnpm typecheck && pnpm test`                                        |
| G09_WEB web build             | `pnpm web:build`                                                     |
| G09_CONTENT content build     | `pnpm content:build`                                                 |
| G12 remotion                  | `pnpm remotion:prepare && pnpm remotion:validate && pnpm render:all` |
| G12_QA media                  | `pnpm verify:media`                                                  |
| Preflight completo (VS-001)   | `pnpm slice:build`                                                   |
| Verificación total            | `pnpm verify`                                                        |

Gates G13 (governance), G14 (Guardian), G15 (H01 humano), G16 (readiness), G17 (publish) son **manuales por diseño fail-closed**. No los automatices. Documenta en `TASK.md` como bloqueados.

## Task contract (por tarea ejecutable)

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

**Regla**: sin write-set claro, no se edita. Sin validación, no se marca completo.

## Checkpoints G0-G3

- **G0 antes de editar**: repo confirmado, reglas leídas, `git status` revisado, write-set declarado, cambios ajenos preservados, gaps marcados.
- **G1 contrato listo**: objetivo, inputs, no-objetivos, rutas lectura/escritura, done verificable declarados.
- **G2 antes de cerrar**: no hay escritura fuera del write-set, secretos, PII ni binarios no solicitados. Claims sustantivos con marca de evidencia.
- **G3 cierre**: validación ejecutada o gap declarado; archivos, riesgos y limitaciones listados.
- **Stop**: detente si falta write-set, la fuente requerida no existe, aparece un secreto, o la validación mutaría fuera del alcance.

## Loop de atención

1. **Iniciar sesión**: leer `CLAUDE.md` (este) → `AGENTS.md` → `context.md` → `progress.md`.
2. **Clasificar intención** de video mediante R6 y el arquetipo canónico.
3. **Procesar input** desde `sourceRefs` o attachment autorizado → `source_id` + `raw_sha256` → registrar solo referencias portables.
4. **Ejecutar comando existente** del gate del DAG (NO inventar pipeline). Emitir receipt hash-bound.
5. **Actualizar** `progress.md` + `context.md` y el estado tipado del job.
6. **Cerrar**: `./init.sh && pnpm check:repo`.

## Comandos de verificación

```bash
# Verificación primaria (recomendada)
./init.sh
```

Checks requeridos:

- `pnpm verify:video-os`
- `pnpm typecheck`

## Antes de marcar done

- `./init.sh` → checker estructural, regresiones y tipos en PASS.
- `pnpm check:repo` → PASS sin regresión.
- `git status` → archivos locales no aparecen (gitignored).

## Fuentes

- **`sourceRefs` materializadas**: conservar bytes, calcular `raw_sha256` y bloquear promoción sin procedencia, derechos y autoridad.
- **Attachment/prompt efímero**: no persistirlo ni promoverlo hasta contar con una referencia portable y un receipt de autoridad.
