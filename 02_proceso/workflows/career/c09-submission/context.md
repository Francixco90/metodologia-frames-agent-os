<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-C09
-->

# Contexto: 02_proceso/workflows/career/c09-submission

## 1. Propósito y activación

Preparar preview, autorización de un uso, envío o seguimiento.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:

- `02_proceso/workflows/career/c09-submission/workflow.yml`

## 3. Carga mínima y contexto diferido

Primero:

- `02_proceso/workflows/career/c09-submission/workflow.yml`

Solo bajo demanda:

- `02_proceso/governance/tool-policy.yml`

Diferir:

- `Credenciales`
- `OTP`
- `CAPTCHA y declaraciones humanas`

## 4. Routing, workflow y skills

Rutas: `R7`  
Workflows: `C09`  
Skills primarias: `career-application-orchestrator`

## 5. Tools, efectos y write policy

Tools: `submission_preview`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/workflows/career/c09-submission/workflow.yml`

Write set:

- `02_proceso/workflows/career/c09-submission/context.md`

Privacidad: `private_after_route_lock`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `single_use_authorization`, `material_confirmation`  
Stop rules: Sin confirmación visible queda BLOCKED · Cambiar hash invalida autorización

Hijos:

- Ninguno; devolver handoff al contexto padre.
