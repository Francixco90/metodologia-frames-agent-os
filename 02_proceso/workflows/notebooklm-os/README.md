# NotebookLM OS · por MetodologIA

Módulo transversal `notebooklm-os` para diseñar y operar notebooks gobernados. La
superficie conserva NotebookLM OS y el contrato abstrae `notebooklm | gemini-notebook`.
Las fuentes originales y sus manifests conservan autoridad; el notebook es una proyección.

## Workflow

| Etapa           | Owner                          | Resultado                                          | Stop principal                     |
| --------------- | ------------------------------ | -------------------------------------------------- | ---------------------------------- |
| N00 Intake      | Notebook Conductor             | `NotebookIntentV1`                                 | intención incompleta               |
| N01 Discover    | Notebook Conductor             | auditoría de notebooks, fuentes, Studio y permisos | locator o estado desconocido       |
| N02 Profile     | Profile Architect              | `NotebookProfileV1` + prompt compilado             | política incompleta                |
| N03 Source Plan | Source Curator                 | manifest, precedencia, naming, tags y presupuesto  | fuente fuera de scope              |
| N04 Materialize | Notebook Conductor             | notebook privado configurado                       | `NLM_PLAN_APPROVED`                |
| N05 Curate      | Source Curator / Asset Steward | importación y readback                             | derechos `REVIEW/BLOCKED`          |
| N06 Grounding   | Grounding Verifier             | consultas canónicas con citas                      | `coverage_gap`                     |
| N07 Studio      | Studio Director                | brief específico por tipo y generación             | `NLM_STUDIO_GENERATION_APPROVED`   |
| N08 Verify      | Grounding Verifier             | descarga, relectura y receipt                      | bytes/tipo/fuentes no verificables |
| N09 Govern      | Notebook Guardian              | aprobación, sharing, versión, archivo o retiro     | gate específico                    |

R6 diseña contenido y briefs; R10 opera notebooks y Studio. Una intención mixta encadena
R6 → R10 sin fusionar autoridades. `RENDERED_DRAFT`, `VERIFIED_DRAFT`, `HUMAN_APPROVED`
y `PUBLISHED` son estados distintos.

## Invariantes

- Naming de fuentes: `NN-layer--slug--vX.Y`; Studio: `NN · Resultado · Audiencia · vX`.
- Identidad de fuente por Drive ID, URL canónica o hash; un título no deduplica.
- Máximo activo: 15 controles, 15 assets/ejemplos y 20 fuentes de trabajo.
- Consultas y Studio usan `source_ids` explícitos; “todas” requiere excepción documentada.
- Crear/configurar/importar exige `NLM_PLAN_APPROVED`; sync, Studio, sharing y destrucción
  usan gates separados. Sharing y destrucción consumen autorización de un solo uso.
- Cada mutación exige receipt y readback. Los locators privados nunca se versionan.
- El adaptador readonly existente permanece autoridad para grounding sin escritura.

## Verificación

`pnpm verify:notebooklm-os` valida schemas, piloto, routing, gates, skills, determinismo,
idempotencia y escenarios adversariales sin conectarse a un proveedor.
