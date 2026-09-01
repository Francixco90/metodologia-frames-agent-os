<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-MAINTENANCE
-->

# Contexto: 02_proceso/workflows/maintenance

## 1. Propósito y activación

R9 resolvió corregir evolucionar migrar o retirar Frames.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:

- `02_proceso/workflows/maintenance/_schema/workflow-v1.schema.ts`

## 3. Carga mínima y contexto diferido

Primero:

- `02_proceso/workflows/maintenance/route-maintenance-v1.ts`

Solo bajo demanda:

- `02_proceso/workflows/maintenance/documentation-gate-v1.ts`

Diferir:

- `Superficies fuera del write set`

## 4. Routing, workflow y skills

Rutas: `R9`  
Workflows: `M00`, `M01`, `M02`, `M03`, `M04`, `M05`, `M06`  
Skills primarias: `frames-harness-maintainer`

## 5. Tools, efectos y write policy

Tools: `maintenance_plan`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/workflows/maintenance/_schema/workflow-v1.schema.ts`

Write set:

- `02_proceso/workflows/maintenance/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `HM_CHANGE_APPROVED`, `HM_CANDIDATE_VERIFIED`, `DOCS_TRANSVERSAL_COMPLETE`, `HM_GUARDIAN_VERDICT_RECORDED`, `HM_PROMOTION_APPROVED`  
Stop rules: Impact plan antes de editar · Promoción separada

Hijos:

- Ninguno; devolver handoff al contexto padre.
