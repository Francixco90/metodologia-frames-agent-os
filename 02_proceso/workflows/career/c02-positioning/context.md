<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-C02
-->

# Contexto: 02_proceso/workflows/career/c02-positioning

## 1. Propósito y activación

Definir familias de rol, posicionamiento y restricciones de búsqueda.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:

- `02_proceso/workflows/career/c02-positioning/workflow.yml`

## 3. Carga mínima y contexto diferido

Primero:

- `02_proceso/workflows/career/c02-positioning/workflow.yml`

Solo bajo demanda:

- `02_proceso/workflows/career/_schema`

Diferir:

- `Roles fuera de alcance`

## 4. Routing, workflow y skills

Rutas: `R7`  
Workflows: `C02`  
Skills primarias: `career-application-orchestrator`

## 5. Tools, efectos y write policy

Tools: `positioning`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/workflows/career/c02-positioning/workflow.yml`

Write set:

- `02_proceso/workflows/career/c02-positioning/context.md`

Privacidad: `private_after_route_lock`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `positioning_approved`  
Stop rules: Separar roles principal adyacente y stretch

Hijos:

- Ninguno; devolver handoff al contexto padre.
