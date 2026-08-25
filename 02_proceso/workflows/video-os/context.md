<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-VIDEO-OS
-->

# Contexto: 02_proceso/workflows/video-os

## 1. Propósito y activación

R6 seleccionó un video o derivado audiovisual gobernado por Video OS.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:

- `02_proceso/workflows/video-os/index.ts`

## 3. Carga mínima y contexto diferido

Primero:

- `02_proceso/workflows/video-os/index.ts`
- `02_proceso/workflows/video-os/_schema/video-os-v1.schema.ts`

Solo bajo demanda:

- `02_proceso/workflows/video-os/_schema/index.ts`

Diferir:

- `Runners`
- `assets y schemas no seleccionados por la ruta`

## 4. Routing, workflow y skills

Rutas: `R6`  
Workflows: `V00`, `V01`, `V02`, `V03`, `V04`  
Skills primarias: `content-os-router`

## 5. Tools, efectos y write policy

Tools: `workflow_plan`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/workflows/video-os/index.ts`
- `02_proceso/workflows/video-os/_schema/video-os-v1.schema.ts`

Write set:

- `02_proceso/workflows/video-os/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `G09_VIDEO_OS`, `VO_INTAKE_COMPLETE`, `VO_DIRECTION_APPROVED`, `VO_PRINCIPAL_VERIFIED`, `VO_HANDOFF_APPROVED`  
Stop rules: STOP en VO_DIRECTION_APPROVED hasta aprobación H01 · RENDERED_DRAFT no equivale a HUMAN_APPROVED ni READY ni PUBLISHED

Hijos:

- Ninguno; devolver handoff al contexto padre.
