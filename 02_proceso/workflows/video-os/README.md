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

## Perfil `method-explainer`: alcance material

El arquetipo `method-explainer` prepara y verifica contratos para explicar un método con
diagramas HTML/SVG deterministas. Su adapter de General Video opera exclusivamente en
`PLAN_VERIFY_ONLY`: puede planear una solicitud o verificar un bundle material existente, pero no
tiene autoridad para componer, renderizar ni publicar. Su estado máximo es `BLOCKED` y conserva el
`coverage_gap` `GENERAL_VIDEO_METHOD_EXPLAINER_NOT_PROMOTED`. [CONFIG]

| Superficie      | Qué existe hoy                                                                                                                  | Límite honesto                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Contratos       | Intención, supuestos, modelo del método, presupuesto de beats, voz, diagrama, build y ejecución desatendida ligados por hashes. | Validar contratos no materializa audio ni video.                                      |
| Adapter         | Planificación y verificación de bundles existentes, sin efectos.                                                                | `render_authority:false` y `publication_authority:false`.                             |
| Diagrama        | `DiagramStage` y sus primitivas, geometría y guards; pruebas offline con fixtures sintéticos.                                   | No existe una composición end-to-end promovida que consuma el bundle y produzca MP4.  |
| Voz y captions  | Contratos y políticas que comparan declaraciones y mediciones aportadas.                                                        | ASR/captions son `DECLARATIVE_ONLY`; no hay TTS, normalización ni escucha acreditada. |
| Skill de diseño | Candidate S04 con fixtures y validadores locales.                                                                               | `UNREGISTERED_DRAFT · CANDIDATE_PENDING_GATE`; no está activa ni ejecutada.           |

La spec gobierna y cada derivado conserva sus hashes. En cada checkpoint, el lector estable
observa y bloquea symlinks, sustituciones o drift detectados entre sus validaciones. Conserva los
gaps `HOST_OBJECT_TRAPS_REQUIRE_OUTER_TIME_BOUND` y `NODE_FS_OPENAT_UNAVAILABLE`: no acredita
exclusión concurrente absoluta, calidad creativa ni promoción. [CONFIG]

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

Para `method-explainer`, ni siquiera `RENDERED_DRAFT` es una salida autorizada por el adapter
actual. El siguiente gate es promover de forma independiente la ruta de composición/render,
registrar la skill mediante S00–S09 y aportar evidencia audiovisual material. [CONFIG]

## Referencia

Reglas de agentes: [AGENTS.md](AGENTS.md). Contrato de entrada Claude Code: [CLAUDE.md](CLAUDE.md). Contrato Gemini CLI: [GEMINI.md](GEMINI.md). Invariantes: [CONSTITUTION.md](CONSTITUTION.md).
