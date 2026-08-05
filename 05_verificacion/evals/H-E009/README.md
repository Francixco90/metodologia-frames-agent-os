# H-E009 — run-check receipt is append-only + sha256-bound

## Metadatos

- **ID**: H-E009
- **Subsistema**: Feedback
- **Estado**: spec-only (runner: deferred — receipt format no cableado como
  contrato validable aún)
- **Tipo**: spec-only

## Hipótesis

`run-check.ts` emite un receipt append-only y ligado a `sha256` (del commit
base + salidas) bajo `04_estado/receipts/check-runs/`. El receipt es
inmutable: no se sobrescribe; cada corrida añade un archivo nuevo con hash
determinista. [CÓDIGO]

## Precondiciones

- `run-check.ts` escribe receipts en `04_estado/receipts/check-runs/`. [CÓDIGO]
- Cada receipt incluye `baseCommit` (sha256) y `outputHash` (sha256). [CÓDIGO]
- El directorio de receipts es append-only (convención de gobernanza). [CONFIG]

## Pasos

1. Ejecutar `run-check` para un gate automático (p.ej. G00).
2. Verificar que se añade un archivo nuevo bajo `receipts/check-runs/` (no
   sobrescribe uno existente).
3. Verificar el receipt incluye `baseCommit` y `outputHash` como sha256
   válidos (`^[a-f0-9]{64}$`).
4. Re-ejecutar y verificar que el receipt previo permanece intacto.

## Oráculo

- PASS: append-only (archivo previo intacto) + sha256 válidos presentes.
- FAIL: sobrescribe receipt previo, o hash ausente/no-sha256.

## Atribución de fallo

- Subsistema: Feedback (receipts de verificación).
- Fuentes: `05_verificacion/scripts/run-check.ts`,
  `04_estado/receipts/check-runs/`.
- Invariante: receipts append-only + sha256-bound.
- Nota: runner diferido — el formato de receipt de check-run no está
  formalizado como contrato Zod aún; cubrir cuando se añada
  `CheckRunReceiptSchema`. [coverage_gap]