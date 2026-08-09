<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-P09
-->

# Contexto: 02_proceso/workflows/multimedia/p09-distribuir

## 1. Propósito y activación

Se solicita preparar distribución de un candidate aprobado.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:

- `02_proceso/workflows/multimedia/p09-distribuir/workflow.yml`

## 3. Carga mínima y contexto diferido

Primero:

- `02_proceso/workflows/multimedia/p09-distribuir/workflow.yml`

Solo bajo demanda:

- `02_proceso/governance/tool-policy.yml`

Diferir:

- `Conectores y credenciales`

## 4. Routing, workflow y skills

Rutas: `R6`  
Workflows: `P09`  
Skills primarias: `content-os-router`

## 5. Tools, efectos y write policy

Tools: `distribution_preview`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/workflows/multimedia/p09-distribuir/workflow.yml`

Write set:

- `02_proceso/workflows/multimedia/p09-distribuir/context.md`

Privacidad: `private_after_route_lock`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `human_distribution_authorization`  
Stop rules: Preparar y detener · Nunca publicar por inferencia

Hijos:

- Ninguno; devolver handoff al contexto padre.
