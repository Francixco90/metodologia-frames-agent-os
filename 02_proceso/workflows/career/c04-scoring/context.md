<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-C04
-->

# Contexto: 02_proceso/workflows/career/c04-scoring

## 1. Propósito y activación

Validar vigencia, requisitos, hard stops, fit y shortlist.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:

- `02_proceso/workflows/career/c04-scoring/workflow.yml`

## 3. Carga mínima y contexto diferido

Primero:

- `02_proceso/workflows/career/c04-scoring/workflow.yml`

Solo bajo demanda:

- `02_proceso/workflows/career/_schema`

Diferir:

- `Vacantes cerradas o no verificables`

## 4. Routing, workflow y skills

Rutas: `R7`  
Workflows: `C04`  
Skills primarias: `career-opportunity-finder`

## 5. Tools, efectos y write policy

Tools: `job_validate`, `fit_score`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/workflows/career/c04-scoring/workflow.yml`

Write set:

- `02_proceso/workflows/career/c04-scoring/context.md`

Privacidad: `private_after_route_lock`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `job_valid`, `score_explainable`  
Stop rules: Requisito de vacante nunca se convierte en capacidad

Hijos:

- Ninguno; devolver handoff al contexto padre.
