# Como anadir artefactos gobernados

Antes de escribir lee `docs/program/dag.yml` y `docs/program/ownership-manifest.yml`. Un writer por ruta; sin allowlist asignada, no editas. [CONFIG]

## Agente (RT)

Malla cerrada de 11 roles `RT-01`..`RT-11`. `RoleIdSchema` (`committees/src/contracts.ts`) es un `z.enum` y el registro exige exactamente 11 entradas. [CÓDIGO] Anadir un `RT-12` es un cambio de schema + ownership (extender el enum, el invariante de conteo y el glob `agents/RT-1[0-1]/**`), no una contribucion rutinaria.

Rutina = editar un rol existente:

1. Edita `agents/<ROLE_ID>/contract.yml` (owner `agents-committee`).
2. Recalcula `sha256` del archivo.
3. Rebinda `entries[].legacyV1Contract.sha256` en `registries/agents/agent-registry-v2.yml`. Si cambio `base-contract-v2.yml`, rebinda `baseContract.sha256`.
4. Ejecuta `pnpm verify:orchestration`. Falla hasta que cada hash y campo V1/V2 coincidan.

## Skill

Registro append-only, pero el validador y el recibo de licencia llevan allowlists explicitos. No basta con crear archivos + entrada. [CÓDIGO]

1. Crea `skills/<skill_id>/` con `SKILL.md` (frontmatter: `name`, `description` inicia con "This skill should be used when", `license: LicenseRef-MetodologIA-Internal`, `metadata.lifecycle_state: active`, `metadata.execution_scope`), `LINEAGE.yml` (`content_origin` inicia con `locally_authored`, `publication_authority: false`), `fixtures/positive/*.yml`, `fixtures/negative/*.yml`. Cuerpo ≤ 1200 palabras, sin locators absolutos. [CONFIG]
2. Calcula `content_sha256` (de `SKILL.md`) y `package_manifest_sha256` (`sha256_of_sorted_sha256_double_space_relative_path_lines` sobre el dir completo). [CÓDIGO]
3. Append una entrada a `registries/skills/skill-registry.yml` (append-only; nunca mutar entradas existentes) + 4 eventos lifecycle `null→candidate→quarantined→evaluated→active` (el 3er actor es `skill-foundry-v2-verifier`). [CONFIG]
4. Append `skills/<skill_id>` a `applies_to.package_refs` de `skills/instagram-v2-content-license-receipt.yml`.
5. Edita el allowlist en `scripts/check-instagram-v2-skills.ts` (array `skills`: `id`, `scope`, `productionStatus`, fixture paths, `requiredTerms`). [CÓDIGO]
6. `pnpm verify:skills`. Para skills H03 (creation-v3) usa `registries/skills/creation-v3-skill-registry.yml` y `scripts/check-creation-v3-skills.ts`.

Owner: `skill-foundry` (`skills/**`, `registries/skills/**`).

## Proyecto

`projects/_template/project.yml` esta desactualizado y no pasa `check-projects`. Usa `projects/vs-001-source-to-campaign/` como referencia real. [DOC]

1. Crea `projects/<id>/` con `project.yml` (`schema_version: 1`, `current_state: PARTIAL_CONTROLLED`, dos work products `web`+`video`, todos los flags `false`, ≥1 `coverage_gaps`), `source-bundle.yml` (`schema_version: 2`) y `claims-ledger.yml` (`schema_version: 1`, append-only). [CONFIG]
2. Produce el artefacto web + `build-receipt.json` y el render video + recibo `receipts/renders/RCP-<ID>-001.json` (`render-receipt-v2`).
3. Append una entrada a `registries/projects/project-registry.yml` (append-only) con `manifest_ref`, `source_bundle_ref`, `claims_ledger_ref`. [CONFIG]
4. `pnpm check:projects`.

Owners: `lead` (`project.yml`, `registries/projects/**`), `sources` (`source-bundle.yml`, `claims-ledger.yml`), `web` (`web/**`), `remotion` (`remotion/**`, `receipts/renders/**`). Limitacion: `check-projects.ts` esta hardcodeado a `vs-001` (paths de render, ids de recibo). Un segundo proyecto requiere refactor del script. [CÓDIGO]

## Contrato (core/contracts)

Patron Zod: `z.strictObject` + `superRefine` para invariantes, importa primitivas de `./primitives.ts`, exporta `Schema` y `Type = z.infer<typeof Schema>`. [CÓDIGO]

1. Crea `core/contracts/<nombre>-vN.ts`.
2. Reexporta desde `core/contracts/index.ts` (NO repitas el descuido de `content-v2.ts`, que falta en el barrel y obliga a imports profundos). [CÓDIGO]
3. Test en `tests/contract/` o `tests/unit/core/`. Si es canonico, anade la ruta a `scripts/check-repo.ts` y vincula `G08`.
4. `pnpm typecheck && pnpm test && pnpm check:repo`.

Owner: `core` (`core/**`).

## Recibo (receipts)

Append-only (ADR 008). No existe `check-receipts` generico; validacion por familia. [DOC]

| Familia                       | Owner            | Schema / check                                                     |
| ----------------------------- | ---------------- | ------------------------------------------------------------------ |
| `receipts/imports/`           | sources          | `schema_version: 1`, `check-sources` (no en `verify`)              |
| `receipts/renders/`           | remotion         | `render-receipt-v2`, `check-projects` (hardcodeado vs-001)         |
| `receipts/dependency-audits/` | qa               | `renderer-license-receipt-v1`, `verify:dependencies` (en `verify`) |
| `receipts/migrations/`        | governance       | `append-only-evidence-migration-v1`, `check-projects`              |
| `receipts/schemas/`           | agents-committee | `committee-receipt.ts` (unico schema Zod de recibos)               |
| `receipts/builds/`            | repo             | no materializado aun                                               |
| `receipts/carousel/`          | static-social    | no materializado aun                                               |
| `receipts/releases/`          | n8n              | no materializado aun                                               |

1. Identifica la familia y el owner. El recibo es append-only y hash-bound al artefacto que evidencia.
2. Si supersede, append un nuevo registro con `supersedes` (id+ref+sha256 del previo); nunca sobrescribas el archivo anterior.
3. Crea el dir primero si es `builds/`, `carousel/` o `releases/` (no existen en disco). [DOC]
4. Ejecuta el check de la familia (`verify:dependencies`, `check:projects`, `check:sources`).

Gaps: sin schema Zod formal para imports/migrations/carousel/builds/release (solo committee). Cubrimiento parcial en `verify`. [DOC]
