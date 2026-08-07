# ADR 0027 — Atemporal naming: contrato vs tiempo vs lifecycle

Estado: `ACCEPTED_FOR_LOCAL_EVALUATION` · 2026-08-06. No acredita producción ni
publicación. [CONFIG]

## Contexto

El repositorio mezclaba tres concerns distintos en los nombres de archivo y
identificadores: (1) identidad de contrato (`-vN`, `schema_version`, `manifest_id`),
(2) traza temporal/versiones (fechas en nombres de reporte, ids con fecha, pins de
fecha hardcodeados), (3) estados de lifecycle (`RENDERED_DRAFT != FINAL !=
HUMAN_APPROVED != READY != PUBLISHED`). La indistinción generaba nombres que
parecían versionados cuando solo eran identidad de contrato, y archivos que
parecían atemporales cuando llevaban fecha en el nombre. [DOC]

## Decisión

El repositorio es atemporal: **solo las tareas (y sus receipts) llevan traza de
tiempos/versiones**. Tres concerns, tres tratamientos:

- **Contrato (`-vN`, `schema_version`, `manifest_id`)**: identidad, no versión
  temporal. Se preserva. Evolución append-only vía `supersedes` + zod
  `discriminatedUnion` (patrón `core/contracts/schemas.ts:297-319`). No se
  renombran archivos `-vN`. [CÓDIGO]
- **Tiempo**: permitido solo en `04_estado/receipts/**` y `04_estado/tasks/**`
  (trazas de tarea). Prohibido en nombres de archivo, ids de contrato y
  date-pins de código sin constante nombrada. Los date-pins hash-bound
  (cuyo valor literal está sellado a un hash) se preservan literales; solo se
  parametriza el nombre vía `deterministic-epoch.ts`. [CONFIG]
- **Lifecycle**: ortogonal a versiones. `RENDERED_DRAFT != FINAL !=
HUMAN_APPROVED != READY != PUBLISHED` se preserva; un build/render nunca
  concede estos estados. [CONFIG]

## Consecuencias

- Nuevos reportes se emiten como receipts append-only
  (`04_estado/receipts/check-runs/C-<KIND>-NNN/receipt.yml`), no como archivos
  dated. La traza temporal vive en el contenido del receipt + dir timestamped.
- Gate **G21 `check:atemporal`** enforce forward: ningún archivo versionable con
  fecha en nombre fuera de `receipts/` o `tasks/`. [CÓDIGO]
- `skills-lock.json` y `manifest_id` strings (`router-v1`, `tool-policy-v1`,
  `commands-v1`) son identidad de contrato, no versiones temporales.

## Excepciones

- Date-pins hash-bound en `renderers/remotion/src/{validation-evidence,append-only-evidence}.ts`:
  valor literal inmutable (sellado a hash); solo el nombre se parametriza.
- Immutability baselines (`BASELINE_FILE_COUNT`, `V2_CLOSURE_COMMIT`,
  `H02_LOCK_SHA256`, `baselineTextLines`): anclas de inmutabilidad, no trazas
  temporales de repo. [CONFIG]
- `manifest_id: metodologia-social-fonts-20260720` en `brand/fonts/font-manifest.yml`:
  el id lleva fecha pero el archivo está sellado a la cadena hash-bound del
  Guardian de `pilot-carousel-001` (`rt09-review.json` → `GDN-CAR-MAO-001.yml`
  → orquestación). Stripar la fecha requiere re-review por Guardian (actor
  distinto, no-writer). `coverage_gap`: defered a tarea dedicada Guardian.
  [coverage_gap]
