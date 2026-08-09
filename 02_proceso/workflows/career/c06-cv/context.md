<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-C06
-->

# Contexto: 02_proceso/workflows/career/c06-cv

## 1. Propósito y activación

Componer CV basado en evidencia y renderizar HTML y PDF ATS.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:

- `02_proceso/workflows/career/c06-cv/workflow.yml`

## 3. Carga mínima y contexto diferido

Primero:

- `02_proceso/workflows/career/c06-cv/workflow.yml`

Solo bajo demanda:

- `02_proceso/workflows/career/_assets/deliverable-registry.yml`

Diferir:

- `Evidencia no autorizada`

## 4. Routing, workflow y skills

Rutas: `R7`  
Workflows: `C06`  
Skills primarias: `evidence-first-cv`

## 5. Tools, efectos y write policy

Tools: `career_render`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/workflows/career/c06-cv/workflow.yml`

Write set:

- `02_proceso/workflows/career/c06-cv/context.md`

Privacidad: `private_after_route_lock`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `ats`, `parity`, `evidence`  
Stop rules: Claims y métricas deben conservar contexto y límites

Hijos:

- Ninguno; devolver handoff al contexto padre.
