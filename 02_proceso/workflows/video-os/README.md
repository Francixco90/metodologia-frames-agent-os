# README.md

Este sistema convierte intención en resultados por procesos auto orquestado.

> Invariantes no negociables (estados, gates, fail-closed, evidence tags, profundidad ≤ 4, identidad MetodologIA) en [CONSTITUTION.md](CONSTITUTION.md). Este archivo es la visión humana de arranque.

## Supuestos

- El humano arranca el sistema con `./init.sh` y lee este archivo primero.
- La profundidad máxima de recursión/orquestación es 4.
- El sistema es fail-closed: una ausencia no se sustituye por una inferencia pulida.

## Alternativas consideradas

- **README extenso con todas las reglas**: rechazado — duplica CONSTITUTION.md.
- **README mínimo sin mapa de carpetas**: rechazado — el humano necesita orientación física.
- **README con visión + mapa + arranque, referenciando CONSTITUTION.md**: elegido — DRY + orientación.

## Qué hace el sistema

Video OS convierte un encargo breve en un flujo `V00–V04`, como perfil especializado de la ruta R6 de Frames. Reutiliza Multimedia y General Video, emite receipts hash-bound y detiene efectos en los gates manuales. [DOC]

## Cómo arrancar

```bash
./init.sh
```

`init.sh` verifica entorno, lee `feature_list.json` y deja el repo restartable. Si la verificación de baseline falla, repárala antes de añadir scope.

## Mapa de carpetas

| Carpeta             | Propósito                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| `00_inbox`          | Entradas crudas: prompts (P-01..P-04) y assets. Asignar `source_id`, conservar bytes, calcular `raw_sha256`. |
| `01_intencion`      | Brief, intención declarada.                                                                                  |
| `10_proceso`        | DAG, gates y workflows (`10_proceso/gates/`, `10_proceso/workflows/`).                                       |
| `20_artefactos`     | Entregables en progreso (capas intermedias editables).                                                       |
| `feature_list.json` | Estado canónico y dependencias del feature activo.                                                           |
| `progress.md`       | Continuidad compacta y próximo paso.                                                                         |
| `init.sh`           | Entrada de verificación fail-fast.                                                                           |
| `99_archive`        | Paquetes cerrados y archivados.                                                                              |

Profundidad máxima: 4 niveles. Sin recursión abierta ni symlinks. `00_inbox` y `99_archive` son
rutas de jobs privados, no carpetas versionadas dentro del producto. [CONFIG]

## Comando de verificación

```bash
pnpm verify:video-os
```

Checks requeridos:

- `pnpm verify:video-os`
- `pnpm typecheck`

## Estados no negociables

`RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED`. Un build exitoso nunca concede `HUMAN_APPROVED`, `READY` ni `PUBLISHED`. Detalle en [CONSTITUTION.md](CONSTITUTION.md).

## Referencia

Reglas de agentes: [AGENTS.md](AGENTS.md). Contrato de entrada Claude Code: [CLAUDE.md](CLAUDE.md). Contrato Gemini CLI: [GEMINI.md](GEMINI.md). Invariantes: [CONSTITUTION.md](CONSTITUTION.md).
