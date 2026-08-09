<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-MULTIMEDIA
-->

# Contexto: 02_proceso/workflows/multimedia

## 1. Propósito y activación

R6 resolvió creación, mejora, planificación o revisión de contenido.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:

- `AGENTS.md`
- `02_proceso/workflows/multimedia/index.ts`

## 3. Carga mínima y contexto diferido

Primero:

- `02_proceso/workflows/multimedia/index.ts`

Solo bajo demanda:

- `02_proceso/workflows/multimedia/_assets/deliverable-definition-registry.yml`

Diferir:

- `Etapas no seleccionadas`
- `templates y prompts de otros idiomas`

## 4. Routing, workflow y skills

Rutas: `R6`  
Workflows: `P00`, `P01`, `P02`, `P03`, `P04`, `P05`, `P06`, `P07`, `P08`, `P09`  
Skills primarias: `content-os-router`

## 5. Tools, efectos y write policy

Tools: `workflow_plan`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/workflows/multimedia/index.ts`

Write set:

- `02_proceso/workflows/multimedia/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `MW_BRIEF_APPROVED`  
Stop rules: Brief first · P09 no publica sin aprobación específica

Hijos:

- `CTX-P00`
- `CTX-P01`
- `CTX-P02`
- `CTX-P03`
- `CTX-P04`
- `CTX-P05`
- `CTX-P06`
- `CTX-P07`
- `CTX-P08`
- `CTX-P09`
