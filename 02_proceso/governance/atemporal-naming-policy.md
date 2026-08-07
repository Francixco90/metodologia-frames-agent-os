# Atemporal naming policy

El repositorio es atemporal: **solo las tareas (y sus receipts) llevan traza de
tiempos/versiones**. Tres concerns distintos, tres tratamientos. Ver ADR 0027.
[CONFIG]

## Tres concerns

| Concern   | Tratamiento                                            | Ejemplos                                                                                                    |
| --------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Contrato  | Preservar (identidad, no versión)                      | `-vN` suffix, `schema_version`, `manifest_id`, gates `GNN`/`MW_*`, rutas `R0`..`R5`, roles `RT-01`..`RT-11` |
| Tiempo    | Solo en `04_estado/receipts/**` y `04_estado/tasks/**` | timestamps en contenido de receipts, dirs timestamped, `task.yaml`                                          |
| Lifecycle | Ortogonal a versiones                                  | `RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED`                                           |

## Allowlist (trazas legítimas — preservar)

- `04_estado/receipts/**` (ADR 008): timestamps en contenido + dirs timestamped.
- `03_artefactos/skills/vendor/**`: contenido externo capturado (la fecha es
  semántica de la captura, no versionado del repo).
- `schema_version` zod literals (`task-contract-v1`, `render-receipt-v2`, etc.).
- `manifest_id` strings (`router-v1`, `tool-policy-v1`, `commands-v1`).
- Gates `G00`..`G21` + `MW_*`; rutas `R0`..`R5`; role ids `RT-01`..`RT-11`.
- Immutability baselines: `BASELINE_FILE_COUNT`, `V2_CLOSURE_COMMIT`,
  `H02_LOCK_SHA256`, `baselineTextLines` — anclas de inmutabilidad, no tiempo.
- Date-pins hash-bound en `renderers/remotion/src/{validation,append-only}-evidence.ts`
  (valor literal sellado a hash).

## Denylist (corregir — ninguna aparece en nombres/ids tras G21)

- Fecha en nombre de archivo fuera de `receipts/` o `tasks/`
  (`doctor-2026-08-05.yml`, `env-drift-2026-08-06.yml`, `tool-grants-2026-08-05.yml`).
- Fecha en id de contrato (`metodologia-social-fonts-20260720` — `coverage_gap`:
  sellado a cadena hash-bound Guardian de `pilot-carousel-001`; strip requiere
  re-review Guardian dedicada, no this engagement).
- Date-pins hardcodeados en código sin constante nombrada (`FIXED_TS`,
  `BACKFILL_TIMESTAMP`, `NOW`). Parametrizar vía `scripts/lib/deterministic-epoch.ts`.

## Reglas

1. **No renombrar archivos `-vN`**. `-vN` = identidad de contrato; la evolución
   es append-only vía `supersedes` + `discriminatedUnion`. [CÓDIGO]
2. **Nuevo reporte → receipt append-only** en `04_estado/receipts/check-runs/`,
   no archivo dated. [CONFIG]
3. **Date-pin en código → constante nombrada** de `deterministic-epoch.ts`.
   Preservar valor si es hash-bound. [CÓDIGO]
4. **Id de contrato sin fecha**. [CONFIG]
5. **Gate G21 `check:atemporal`** enforce forward: falla si un archivo
   versionable matchea `\d{4}-\d{2}-\d{2}` o `20\d{6}` en el nombre y no está
   bajo `receipts/` o `tasks/`. [CÓDIGO]

## Excepciones documentadas

- `changelog.md` (raíz): append-only, traza temporal de PRs/commits. No es
  nombre dated; el contenido lleva timestamps.
- Working docs (`CONTEXT.md`, `TASK.md`, `CLAUDE.md`): atemporales; la traza
  temporal vive en `changelog.md`.

Owner: `governance` (`governance/**`, `adrs/**`).
