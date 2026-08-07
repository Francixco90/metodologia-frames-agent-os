# Artifact Registry — Multimedia P00–P09

**Fuente**: `MIA-MEDIA-LIB-2.0.0` v2.0.0-candidato. Los 33 artefactos nombrados que circulan por la cadena P00→P09. [DOC]

Cada artefacto tiene un `schema_ref` (relativo al repo) que valida su estructura. El `workflow.yml.outputs` de cada etapa declara qué artefactos produce; el `workflow.yml.inputs` de la etapa siguiente los consume (handoff fail-closed).

## Registro por etapa

| Etapa | Artefacto | schema_ref (relativo) |
|-------|-----------|----------------------|
| **P00 definir-sistema** | Brand OS | `02_proceso/workflows/multimedia/_schema/artifacts/brand-os-v1.schema.ts` |
| P00 | Calibration sample | `…/calibration-sample-v1.schema.ts` |
| P00 | Pilot plan | `…/pilot-plan-v1.schema.ts` |
| **P01 curar-material** | Capture Card | `…/capture-card-v1.schema.ts` |
| P01 | Triage Record | `…/triage-record-v1.schema.ts` |
| P01 | Digest / Shortlist | `…/digest-shortlist-v1.schema.ts` |
| **P02 investigar** | Claim Register | `…/claim-register-v1.schema.ts` |
| P02 | Opportunity Map | `…/opportunity-map-v1.schema.ts` |
| P02 | Question Bank | `…/question-bank-v1.schema.ts` |
| **P03 crear-brief** | Brief / Campaign Map | `…/brief-campaign-map-v1.schema.ts` |
| P03 | A/B concepts | `…/ab-concepts-v1.schema.ts` |
| P03 | Definition of Ready (DoR) | `…/definition-of-ready-v1.schema.ts` |
| **P04 calendarizar** | Editorial Calendar | `…/editorial-calendar-v1.schema.ts` |
| P04 | Board | `…/board-v1.schema.ts` |
| P04 | Batch Plan | `…/batch-plan-v1.schema.ts` |
| **P05 disenar-pieza** | Creative Specification | `…/creative-spec-v1.schema.ts` |
| P05 | Continuity Bible | `…/continuity-bible-v1.schema.ts` |
| P05 | Asset Map | `…/asset-map-v1.schema.ts` |
| P05 | Universal prompts | `…/universal-prompts-v1.schema.ts` |
| P05 | Derivatives | `…/derivatives-v1.schema.ts` |
| **P06 crear-activos** | Asset Package | `…/asset-package-v1.schema.ts` |
| P06 | Asset Manifest | `…/asset-manifest-v1.schema.ts` |
| P06 | Capability Report | `…/capability-report-v1.schema.ts` |
| P06 | Tool Run Evidence | `…/tool-run-evidence-v1.schema.ts` |
| **P07 revisar** | Review Report | `…/review-report-v1.schema.ts` |
| P07 | Verdict | `…/verdict-v1.schema.ts` |
| P07 | Top-5 changes | `…/top5-changes-v1.schema.ts` |
| **P08 editar** | Edit Candidate | `…/edit-candidate-v1.schema.ts` |
| P08 | EDL | `…/edl-v1.schema.ts` |
| P08 | Export Matrix | `…/export-matrix-v1.schema.ts` |
| **P09 distribuir** | Platform Package | `…/platform-package-v1.schema.ts` |
| P09 | Publication Record | `…/publication-record-v1.schema.ts` |
| P09 | Learning Report | `…/learning-report-v1.schema.ts` |

## Estado de los schemas

Los `schema_ref` listados apuntan a `02_proceso/workflows/multimedia/_schema/artifacts/`. **Estado:
envelope materializado** — 33 schemas Zod emitidos por `05_verificacion/scripts/scaffold-artifact-schemas.ts`
(`pnpm mw:scaffold-artifacts`). Cada schema valida el **envelope** del artefacto (identity + handoff:
`artifact_id`, `display_name`, `stage`, `producer_stage`/`consumer_stage`, `required`, `provenance`)
contra la tabla anterior — contrato real, no forward.

**`coverage_gap`**: el campo `content` (`z.unknown()`) no valida contenido creativo. Los field
definitions de `MIA-MEDIA-LIB-2.0.0` no están en este repo; fabricarlos violaría fail-closed. La
validación de contenido se resuelve cuando la lib aterrice (Phase 3 D4, evals por workflow).

El gate `MW_CAPABILITY` (MW-CAP-04) ahora verifica **file existence** del `.schema.ts` + entrada en
este registro — el binding `capability_map.assets` → schema es real, no forward-contract.

## Handoff

P0N.consume ⊆ P0(N-1).produce. El runner `_runner/run.ts` assertiona existencia del input (fail-closed handoff). La consistencia del contrato de cadena se valida en `H-E023` (chain eval, Phase 3 D4).