# H-E011 — doctor reports 6 receipt families

## Metadatos

- **ID**: H-E011
- **Subsistema**: Feedback
- **Estado**: executable (oracle.ts vía generic runner)
- **Tipo**: executable

## Hipótesis

`doctor.ts` reporta exactamente 6 familias de receipts bajo
`04_estado/receipts/`: `imports`, `renders`, `dependency-audits`,
`migrations`, `check-runs`, `workflows`. La verificación pasa cuando los 6 directorios
familia existen. [CÓDIGO]

## Precondiciones

- `doctor.ts` define `RECEIPTS_FAMILIES = ['imports', 'renders',
  'dependency-audits', 'migrations', 'check-runs', 'workflows']`. [CÓDIGO]
- `doctor.ts` Check 9 recorre las 6 familias y emite PASS si todas existen. [CÓDIGO]

## Pasos

1. Asegurar que `04_estado/receipts/` contiene los 6 subdirectorios familia.
2. Ejecutar `pnpm doctor`.
3. Verificar que el reporte incluye `5 family dirs presentes: imports, renders,
   dependency-audits, migrations, check-runs, workflows`.

## Orálogo

- PASS: doctor emite PASS para `receipts` con las 6 familias listadas.
- FAIL: doctor reporta familias ausentes, o el conjunto difiere de las 6
  esperadas.

## Atribución de fallo

- Subsistema: Feedback (salud del entorno de receipts).
- Fuentes: `05_verificacion/scripts/doctor.ts` (`RECEIPTS_FAMILIES`,
  `checkReceipts`), `04_estado/receipts/`.
- Invariante: 6 familias canónicas (la 6ª, `workflows`, se añadió en Phase 1 D2 para multimedia-workflow-receipt-v1); doctor las verifica.
- Runner: `oracle.ts` ejecutable vía `pnpm eval:run --only H-E011`. [CÓDIGO]