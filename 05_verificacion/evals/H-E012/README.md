# H-E012 — backfill dedup preserves meta.original_id

## Metadatos

- **ID**: H-E012
- **Subsistema**: State
- **Estado**: spec-only (runner: deferred — backfill es script one-shot)
- **Tipo**: spec-only

## Hipótesis

`backfill-tasks.ts` deduplica filas por `original_id` (first occurrence wins)
y preserva `meta.original_id` en el `task.yaml` generado, registrando el id
legacy. La dedup es determinista y conserva la trazabilidad al id original. [CÓDIGO]

## Precondiciones

- `backfill-tasks.ts` parsea TASK.md y produce rows con `originalId`. [CÓDIGO]
- La dedup usa `seen` set sobre `row.originalId` (first occurrence wins). [CÓDIGO]
- El `task.yaml` generado incluye `meta.original_id` con el id legacy. [CÓDIGO]

## Pasos

1. Construir un TASK.md fixture con dos filas que compartan `original_id`
   (duplicado).
2. Ejecutar la lógica de parse + dedup de `backfill-tasks.ts`.
3. Verificar que sólo se retiene la primera fila.
4. Verificar que el `task.yaml` resultado incluye `meta.original_id` igual al
   id legacy.

## Oráculo

- PASS: una sola fila retenida (dedup); `meta.original_id` presente y
  coincidente con el id legacy.
- FAIL: ambas filas retenidas (no dedup), o `meta.original_id` ausente/incorrecto.

## Atribución de fallo

- Subsistema: State (continuidad de ids, backfill).
- Fuentes: `05_verificacion/scripts/backfill-tasks.ts` (parse, dedup,
  `original_id`).
- Invariante: dedup por `original_id` + preservación de `meta.original_id`.
- Nota: runner diferido — backfill es script one-shot ya ejecutado; cubrir con
  test de script cuando se añada suite de tests de scripts. [coverage_gap]