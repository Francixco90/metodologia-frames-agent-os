<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-P06
-->

# Contexto: 02_proceso/workflows/multimedia/p06-crear-activos

## 1. Propósito y activación

Deben producirse o capturarse activos materiales.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:

- `02_proceso/workflows/multimedia/p06-crear-activos/workflow.yml`

## 3. Carga mínima y contexto diferido

Primero:

- `02_proceso/workflows/multimedia/p06-crear-activos/workflow.yml`

Solo bajo demanda:

- `02_proceso/governance/tool-policy.yml`

Diferir:

- `Tools no allowlisted y distribución`

## 4. Routing, workflow y skills

Rutas: `R6`  
Workflows: `P06`  
Skills primarias: `content-os-creative`

## 5. Tools, efectos y write policy

Tools: `asset_production`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/workflows/multimedia/p06-crear-activos/workflow.yml`

Write set:

- `02_proceso/workflows/multimedia/p06-crear-activos/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `material_output`, `provenance`  
Stop rules: No declarar output sin archivo y hash releído

Hijos:

- Ninguno; devolver handoff al contexto padre.
