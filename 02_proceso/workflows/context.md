<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-WORKFLOWS
-->

# Contexto: 02_proceso/workflows

## 1. Propósito y activación

Una route lock resolvió una familia y se requiere compilar sus pasos.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:

- `AGENTS.md`
- `02_proceso/governance/router.yml`

## 3. Carga mínima y contexto diferido

Primero:

- `02_proceso/governance/router.yml`

Solo bajo demanda:

- `01_intencion/program/dag.yml`

Diferir:

- `Familias y etapas no seleccionadas`

## 4. Routing, workflow y skills

Rutas: `R6`, `R7`  
Workflows: `P00-P09`, `C00-C09`  
Skills primarias: `content-os-router`

## 5. Tools, efectos y write policy

Tools: `workflow_plan`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/governance/router.yml`

Write set:

- `02_proceso/workflows/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `route_lock`, `workflow_resolution`  
Stop rules: No cargar diez prompts simultáneamente

Hijos:

- `CTX-WORKFLOW-ADAPTERS`
- `CTX-MULTIMEDIA`
- `CTX-CAREER`
- `CTX-EXPERIENCE`
