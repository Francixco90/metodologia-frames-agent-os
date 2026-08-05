# H-E011 — doctor reports 5 receipt families

## Metadatos

- **ID**: H-E011
- **Subsistema**: Feedback
- **Estado**: spec-only (runner: deferred — afirmación estática sobre doctor)
- **Tipo**: spec-only

## Hipótesis

`doctor.ts` reporta exactamente 5 familias de receipts bajo
`04_estado/receipts/`: `imports`, `renders`, `dependency-audits`,
`migrations`, `check-runs`. La verificación pasa cuando los 5 directorios
familia existen. [CÓDIGO]

## Precondiciones

- `doctor.ts` define `RECEIPTS_FAMILIES = ['imports', 'renders',
  'dependency-audits', 'migrations', 'check-runs']`. [CÓDIGO]
- `doctor.ts` Check 9 recorre las 5 familias y emite PASS si todas existen. [CÓDIGO]

## Pasos

1. Asegurar que `04_estado/receipts/` contiene los 5 subdirectorios familia.
2. Ejecutar `pnpm doctor`.
3. Verificar que el reporte incluye `5 family dirs presentes: imports, renders,
   dependency-audits, migrations, check-runs`.

## Orálogo

- PASS: doctor emite PASS para `receipts` con las 5 familias listadas.
- FAIL: doctor reporta familias ausentes, o el conjunto difiere de las 5
  esperadas.

## Atribución de fallo

- Subsistema: Feedback (salud del entorno de receipts).
- Fuentes: `05_verificacion/scripts/doctor.ts` (`RECEIPTS_FAMILIES`,
  `checkReceipts`), `04_estado/receipts/`.
- Invariante: 5 familias canónicas; doctor las verifica.
- Nota: runner diferido — afirmación sobre script versionado; cubrir con un
  test de doctor cuando se añada suite de tests de scripts. [coverage_gap]