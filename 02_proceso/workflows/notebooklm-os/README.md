# NotebookLM OS · por MetodologIA

Módulo transversal `notebooklm-os` para diseñar y operar notebooks gobernados. La
superficie conserva NotebookLM OS y el contrato abstrae `notebooklm | gemini-notebook`.
Las fuentes originales y sus manifests conservan autoridad; el notebook es una proyección.

El perfil público `brand-content-notebook` convierte conversación, comentarios, adjuntos y
referencias en un generador de contenido gobernado. No contiene una marca de ejemplo: compila la
evidencia que aporta el usuario, conserva sus límites y nunca promueve una inferencia a canon.

`inputs → brand intake → evidence states → knowledge pack → profile/source sets → notebook plan →
content brief → technical + brand QA → versioned feedback`

## Workflow

| Etapa           | Owner                                     | Resultado                                                          | Stop principal                                      |
| --------------- | ----------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------- |
| N00 Intake      | Notebook Conductor / Brand Intake Analyst | `NotebookIntentV1`; para marca, `BrandIntakePacketV1`              | identidad, propósito o efecto incompleto            |
| N01 Discover    | Brand Intake Analyst / Source Curator     | auditoría de inputs, fuentes, permisos y conflictos                | locator, derechos o autoridad desconocidos          |
| N02 Profile     | Profile Architect                         | `NotebookProfileV1` + prompt compilado; para marca, knowledge pack | política o evidencia incompleta                     |
| N03 Source Plan | Source Curator / Brand Kit Compiler       | manifest, source sets, naming, tags y presupuesto                  | fuente fuera de scope                               |
| N04 Materialize | Notebook Conductor                        | notebook privado configurado                                       | `NLM_PLAN_APPROVED`                                 |
| N05 Curate      | Source Curator / Asset Steward            | importación y readback                                             | derechos `REVIEW/BLOCKED`                           |
| N06 Grounding   | Grounding Verifier                        | consultas canónicas con citas                                      | `coverage_gap`                                      |
| N07 Studio      | Brand Content Director / Studio Director  | brief de canal o Studio y generación opcional                      | brief sin fuentes; `NLM_STUDIO_GENERATION_APPROVED` |
| N08 Verify      | Grounding Verifier / Brand Verifier       | relectura, QA técnica y de marca, receipts                         | tipo, fuentes, derechos o marca no verificables     |
| N09 Govern      | Notebook Guardian                         | aprobación, sharing, versión, archivo o retiro                     | gate específico                                     |

R6 diseña contenido y briefs; R10 opera notebooks y Studio. Una intención mixta encadena
R6 → R10 sin fusionar autoridades. `RENDERED_DRAFT`, `VERIFIED_DRAFT`, `HUMAN_APPROVED`
y `PUBLISHED` son estados distintos.

## Invariantes

- Naming de fuentes: `NN-layer--slug--vX.Y`; Studio: `NN · Resultado · Audiencia · vX`.
- Identidad de fuente por Drive ID, URL canónica o hash; un título no deduplica.
- Máximo activo: 15 controles, 15 assets/ejemplos y 20 fuentes de trabajo.
- Consultas y Studio usan `source_ids` explícitos; seleccionar todas las fuentes está bloqueado.
- Crear/configurar/importar exige `NLM_PLAN_APPROVED`; sync, Studio, sharing y destrucción
  usan gates separados. Sharing y destrucción consumen autorización de un solo uso.
- Cada mutación exige receipt y readback. Los locators privados nunca se versionan.
- El adaptador readonly existente permanece autoridad para grounding sin escritura.

## Brand Content Builder

### Entradas y autoridad

- Acepta turnos de conversación, comentarios, documentos, PDFs, imágenes, URLs, referencias Drive,
  audio, video o transcripciones mediante `BrandInputRefV1`.
- Conserva modalidad, digest, procedencia, sensibilidad, derechos y relación original/extracción.
  Los locators privados son efímeros y no entran en commits ni receipts portables.
- Cada regla queda `OBSERVED`, `INFERRED`, `USER_CONFIRMED`, `SOURCE_VERIFIED` o `BLOCKED`.
  Confianza alta no reemplaza autoridad. Las contradicciones se resuelven o permanecen visibles.
- Originales y manifests gobiernan; Markdown optimiza recuperación. PDFs e imágenes pueden inspirar,
  pero no conceden derechos ni convierten una muestra en regla universal.

### Knowledge pack y prompts

El builder separa Control, Canon, Evidence, Templates, Golden References, Assets y Operations. Compila
knowledge map, bootstrap limitado, prompt operativo completo, manifests, source sets y grounding
suite. Sin esa aprobación el build termina en `BRAND_PROFILE_REVIEW`; una activación consume un
receipt `NLM_BRAND_PROFILE_APPROVED` ligado al digest exacto del perfil revisado. Solo entonces puede
llegar a `BRAND_NOTEBOOK_PLAN_READY`, con receipt por etapa verificada y sin efectos externos.

El contenido se compila con `buildBrandContentBrief` y Studio con `buildBrandStudioBrief`; ambos
revalidan el perfil activo y el source set antes de emitir `BrandContentBriefV1` o `StudioBriefV2`:
idioma/locale, canal, audiencia, objetivo, sources, claims, assets, exclusiones, formato, aceptación,
source-set digest e idempotencia.
La biblioteca pública ofrece nueve formatos Studio y trece canales en el registro brand-neutral del
skill `notebooklm-brand-content-director`. Cada pieza usa un template y brief propios.

### Política operativa

- Chat usa normalmente 3–8 fuentes; Studio 4–12; auditorías amplias, máximo 20 por lote.
- Source set vacío, “usar todo”, claim sin evidencia, asset sin derechos, prompt injection o mezcla
  de marcas bloquean la pieza afectada.
- El idioma de salida sigue la solicitud y el locale aprobado en el perfil; nombres y citas se
  preservan. Si el locale es incierto, se declara el gap en vez de inventar reglas lingüísticas.
- Feedback confirmado produce un perfil o artefacto sucesor. Nunca revalida retroactivamente una
  salida anterior ni sobrescribe silenciosamente el perfil activo.
- `VERIFIED_DRAFT` es el máximo automático. Aprobación editorial, sharing y publicación siguen
  siendo gates independientes.

## Verificación

`pnpm verify:notebooklm-os` valida schemas, routing, gates, skills, templates, determinismo,
idempotencia, brand separation y escenarios adversariales con fixtures sintéticos, sin conectarse
a un proveedor.
