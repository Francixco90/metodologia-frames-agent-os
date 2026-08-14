# Career OS · contrato operativo v2

## Autoridad y alcance A0

Este documento es la autoridad operativa de routing, gates e invalidación para
Career Authoring C00–C09. El Evidence Bank conserva la autoridad factual y la
vacante capturada conserva la autoridad de requisitos; una spec selecciona y
organiza, pero no crea experiencia. [METODOLOGIA][CONFIG]

La cadena normativa para runs nuevos es:

`cv-spec-v2 → cv-source-v2 → cv-package-v3`

`cv-spec-v2` y `cv-package-v3` tienen runtime y verificadores existentes. Sin
embargo, A0 no migra C06/C07, templates ni Deliverable Registry: C07 aún consume
`cv-source-v1` y superficies materiales siguen ligadas a v1. Esto es
`coverage_gap: A1_MATERIAL_MIGRATION_REQUIRED`; hasta A1 no puede afirmarse que
la cadena v2 esté materialmente cerrada ni iniciar un run nuevo por una ruta que
resuelva contratos legacy. [CONFIG]

`cv-spec-v1`, `cv-source-v1` y `cv-package-v2` son compatibility-only. Los
migradores existentes pueden leerlos, pero no convierten por sí solos un run en
activo, aprobado o listo. Toda migración invalida aprobaciones anteriores y debe
producir nuevos hashes v2/v3.

## Recorridos de usuario

1. **ATS rápida:** C00–C02 → C06 ATS → C08. No requiere decisión visual
   ejecutiva; el cierre material v2 permanece bloqueado por A1.
2. **Ejecutiva:** C00–C02 → C06 executive → C08. Exige exactamente dos opciones
   y `CR_CV_DESIGN_APPROVED` sobre la elegida.
3. **Dirigida:** C04–C05 → C06 → C07 opcional → C08. Un requisito sin evidencia
   queda `qualify`, `omit` o `block`; nunca se transforma en claim.

## Gates con autoridad verificable

| Gate                       | Tipo                       | Autoridad                                          |
| -------------------------- | -------------------------- | -------------------------------------------------- |
| `CR_BRIEF_APPROVED`        | humano, manual fail-closed | intención, alcance y fuentes                       |
| `CR_CAREER_EVIDENCE_READY` | técnico                    | checker del interviewer y receipt por candidato    |
| `CR_CV_DESIGN_APPROVED`    | humano, manual fail-closed | decisión visual exacta                             |
| `CR_CV_SPEC_APPROVED`      | humano, manual fail-closed | hash exacto de `cv-spec-v2`                        |
| `CR_CV_COMPILED`           | técnico                    | checker de evidence-first-cv; no aprobación humana |
| `G14`                      | técnico independiente      | verificación; nunca publicación                    |
| `CR_PACKAGE_APPROVED`      | humano, manual fail-closed | hash exacto del package                            |
| `CR_SUBMISSION_AUTHORIZED` | humano, manual fail-closed | autorización de un uso externo limitado            |

El command de un gate técnico acredita que el contrato y sus fixtures son
ejecutables; un run concreto además necesita su receipt material hash-bound.
Ausencia, staleness o mismatch produce `UNKNOWN` o `BLOCKED`, nunca `PASS`.

`CR_PACKAGE_QA` no está activo en A0: no existe command/receipt gobernado en
`commands.yaml`. No es alias de `G14` ni de `CR_PACKAGE_APPROVED` y ninguna
superficie A0 puede declararlo satisfecho. Su eventual promoción requiere un
contrato posterior con command, schema, receipt y casos adversariales. [CONFIG]

## Estados, efectos e invalidación

`SPECIFIED → RENDERED_DRAFT → HUMAN_APPROVED → READY`

Cambiar spec, evidencia, vacante, fuente, diseño, variante o output invalida los
estados posteriores. C09 prepara y se detiene: `packageReady=true` solo permite
llegar a `CR_SUBMISSION_AUTHORIZED`; no prueba envío, no activa conectores y no
autoriza publicación. Datos reales y PII permanecen en rutas privadas ignoradas.
