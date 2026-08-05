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

Convierte intención en resultados por procesos auto orquestado. Un agente lee `CLAUDE.md` (o `GEMINI.md`), clasifica la intención con el router de 4 rutas, ejecuta el comando del gate vigente, emite receipts hash-bound y cierra con validación. Los gates manuales (G13–G17) requieren aprobación humana explícita.

## Cómo arrancar

```bash
./init.sh
```

`init.sh` verifica entorno, lee `feature_list.json` y deja el repo restartable. Si la verificación de baseline falla, repárala antes de añadir scope.

## Mapa de carpetas

| Carpeta | Propósito |
|---|---|
| `00_inbox` | Entradas crudas: prompts (P-01..P-04) y assets. Asignar `source_id`, conservar bytes, calcular `raw_sha256`. |
| `01_intencion` | Brief, intención declarada. |
| `10_proceso` | DAG, gates y workflows (`10_proceso/gates/`, `10_proceso/workflows/`). |
| `20_artefactos` | Entregables en progreso (capas intermedias editables). |
| `80_estado` | `feature_list.json`, `progress.md`, `session-handoff.md` (symlinks retro en raíz). |
| `90_verificacion` | `init.sh` y validators (symlink retro en raíz). |
| `99_archive` | Paquetes cerrados y archivados. |

Profundidad máxima: 4 niveles. Sin recursión abierta. Los archivos de `80_estado/` y `90_verificacion/` se symlinkan en raíz para compatibilidad con validadores que buscan en raíz (symlinks retro).

## Comando de verificación

```bash
{{PRIMARY_VERIFICATION_COMMAND}}
```

Checks requeridos:
{{VERIFICATION_COMMANDS}}

## Estados no negociables

`RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED`. Un build exitoso nunca concede `HUMAN_APPROVED`, `READY` ni `PUBLISHED`. Detalle en [CONSTITUTION.md](CONSTITUTION.md).

## Referencia

Reglas de agentes: [AGENTS.md](AGENTS.md). Contrato de entrada Claude Code: [CLAUDE.md](CLAUDE.md). Contrato Gemini CLI: [GEMINI.md](GEMINI.md). Invariantes: [CONSTITUTION.md](CONSTITUTION.md).