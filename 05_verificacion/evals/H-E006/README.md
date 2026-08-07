# H-E006 — tool-policy denies guardian Edit/Write

## Metadatos

- **ID**: H-E006
- **Subsistema**: Tools
- **Estado**: executable (oracle.ts vía generic runner)

## Hipótesis

`tool-policy.yml` declara al rol `guardian` con `deny: [Edit, Write]` y
`may_remediate: false`. El Guardian es no-writer; sólo lee y verifica. [CONFIG]

## Precondiciones

- `02_proceso/governance/tool-policy.yml` define `role: guardian`. [CONFIG]
- `ownership-manifest.yml` declara `guardian: may_remediate: false`. [CONFIG]
- `TaskContractSchema` refuerza: `responsable: 'guardian'` exige `write_set`
  prefijado `guardian/`. [CÓDIGO]

## Pasos

1. Leer `tool-policy.yml` y localizar la entrada `role: guardian`.
2. Verificar `deny` contiene `Edit` y `Write`.
3. Verificar `ownership-manifest.yml` tiene `non_writers.guardian.may_remediate: false`.

## Oráculo

- PASS: `guardian.deny` incluye `Edit` y `Write`; `may_remediate: false`.
- FAIL: guardian tiene `allow` para Edit/Write, o `may_remediate: true`.

## Atribución de fallo

- Subsistema: Tools (permisos por rol).
- Fuentes: `02_proceso/governance/tool-policy.yml`,
  `docs/program/ownership-manifest.yml`,
  `02_proceso/core/contracts/task-contract.ts` (guard guardia write_set).
- Invariante: Guardian no escribe fuera de `guardian/`; Edit/Write denegados.
- Nota: runner diferido — afirmación estática sobre manifiestos versionados;
  cubrir con un guardián de gobernanza cuando se cablee validación de policy
  en runtime. [coverage_gap]
