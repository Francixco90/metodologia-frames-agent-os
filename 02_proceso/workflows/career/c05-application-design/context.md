<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-C05
-->

# Contexto: 02_proceso/workflows/career/c05-application-design

## 1. Propósito y activación

Diseñar una candidatura concreta y su mapa requisito-evidencia.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:

- `02_proceso/workflows/career/c05-application-design/workflow.yml`

## 3. Carga mínima y contexto diferido

Primero:

- `02_proceso/workflows/career/c05-application-design/workflow.yml`

Solo bajo demanda:

- `02_proceso/workflows/career/_schema`

Diferir:

- `Evidencia no elegida`

## 4. Routing, workflow y skills

Rutas: `R7`  
Workflows: `C05`  
Skills primarias: `career-application-orchestrator`

## 5. Tools, efectos y write policy

Tools: `application_brief`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/workflows/career/c05-application-design/workflow.yml`

Write set:

- `02_proceso/workflows/career/c05-application-design/context.md`

Privacidad: `private_after_route_lock`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `career_brief_approved`  
Stop rules: Gap obligatorio permanece gap o bloquea

Hijos:

- Ninguno; devolver handoff al contexto padre.
