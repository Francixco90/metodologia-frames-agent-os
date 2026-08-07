# H-E008 — Adversarial write-set violation (path outside owner allowlist rejected)

## Metadatos

- **ID**: H-E008
- **Subsistema**: Tools
- **Estado**: executable
- **Runner**: `runner.ts` (vitest, top-level describe)

## Hipótesis

Una tarea con `write_set` listando una ruta fuera de cualquier allowlist de
owner (p.ej. `secrets/private-key.pem`) es rechazada. El validador detecta la
violación adversarial: la ruta no cae bajo ningún patrón de owner declarado,
ni bajo el prefijo `guardian/` (que sólo aplica a `responsable: guardian`). [CÓDIGO]

## Precondiciones

- `TaskContractSchema` valida `write_set` como `RelativePathSchema[]` (sin
  path traversal ni rutas absolutas). [CÓDIGO]
- `RelativePathSchema` admite `secrets/private-key.pem` (ruta relativa
  válida) → el schema por sí solo no rechaza; se requiere chequeo de
  allowlist. [CÓDIGO]
- `tool-policy.yml` define allowlists por owner (lead, repo, qa, core,
  governance); `guardian` es no-writer. [CONFIG]
- Fixture: `task.yaml` con `responsable: lead` y `write_set` incluyendo
  `secrets/private-key.pem` (fuera de la allowlist de lead). [CONFIG]

## Pasos

1. Cargar `fixture/task.yaml` y parsear con `TaskContractSchema.safeParse`
   (debe pasar el schema — la ruta es relativa válida).
2. Definir la allowlist de `lead` (patrones espejo de `tool-policy.yml`).
3. Para cada path en `write_set`, verificar que cae bajo algún patrón de la
   allowlist del responsable.
4. Afirmar que `secrets/private-key.pem` es detectado como fuera-de-allowlist
   → FAIL (violación adversarial detectada).

## Oráculo

- PASS: el chequeo de allowlist detecta `secrets/private-key.pem` como
  fuera-de-allowlist (se emite un error para esa ruta).
- FAIL: la ruta adversarial pasa el chequeo de allowlist (no se detecta
  violación).

## Atribución de fallo

- Subsistema: Tools (boundaries de escritura, scope adversarial).
- Fuentes: `02_proceso/governance/tool-policy.yml` (allowlists por owner),
  `02_proceso/core/contracts/task-contract.ts` (`write_set`,
  `RelativePathSchema`),
  `docs/program/ownership-manifest.yml` (one-writer-per-path).
- Invariante: write_set fuera de allowlist del responsable → rechazado.
- Fixture: `fixture/task.yaml` (responsable lead, write_set con
  `secrets/private-key.pem`).

## Determinismo

El runner usa una allowlist hardcoded determinista y hashes/timestamps
fijos. No usa `Date.now` ni `Math.random`. [CÓDIGO]
