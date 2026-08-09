<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-C08
-->

# Contexto: 02_proceso/workflows/career/c08-package-qa

## 1. Propósito y activación

Congelar y verificar claims, idioma, paridad, legibilidad y requisitos.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:

- `02_proceso/workflows/career/c08-package-qa/workflow.yml`

## 3. Carga mínima y contexto diferido

Primero:

- `02_proceso/workflows/career/c08-package-qa/workflow.yml`

Solo bajo demanda:

- `01_intencion/program/test-strategy.md`

Diferir:

- `Contexto mutable del producer`

## 4. Routing, workflow y skills

Rutas: `R7`  
Workflows: `C08`  
Skills primarias: `dev-verification-before-completion`

## 5. Tools, efectos y write policy

Tools: `package_qa`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/workflows/career/c08-package-qa/workflow.yml`

Write set:

- `02_proceso/workflows/career/c08-package-qa/context.md`

Privacidad: `private_after_route_lock`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `candidate_freeze`, `independent_verdict`  
Stop rules: Producer verifier y Guardian son instancias distintas

Hijos:

- Ninguno; devolver handoff al contexto padre.
