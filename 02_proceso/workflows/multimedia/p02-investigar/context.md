<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-P02
-->
# Contexto: 02_proceso/workflows/multimedia/p02-investigar

## 1. Propósito y activación

Faltan evidencia, claims o contexto suficiente para producir.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:
- `02_proceso/workflows/multimedia/p02-investigar/workflow.yml`

## 3. Carga mínima y contexto diferido

Primero:
- `02_proceso/workflows/multimedia/p02-investigar/workflow.yml`

Solo bajo demanda:
- `04_estado/registries/claims`

Diferir:
- `Fuentes fuera de alcance`

## 4. Routing, workflow y skills

Rutas: `R6`  
Workflows: `P02`  
Skills primarias: `content-os-core`

## 5. Tools, efectos y write policy

Tools: `research_authorized`  
Modo: `generated_only`. Read set mínimo:
- `02_proceso/workflows/multimedia/p02-investigar/workflow.yml`

Write set:
- `02_proceso/workflows/multimedia/p02-investigar/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `evidence`  
Stop rules: Claim no demostrado conserva límite visible

Hijos:
- Ninguno; devolver handoff al contexto padre.
