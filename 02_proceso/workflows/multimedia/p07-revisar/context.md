<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-P07
-->

# Contexto: 02_proceso/workflows/multimedia/p07-revisar

## 1. Propósito y activación

Revisar contenido, marca, evidencia, derechos, accesibilidad y QA visual.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:

- `02_proceso/workflows/multimedia/p07-revisar/workflow.yml`

## 3. Carga mínima y contexto diferido

Primero:

- `02_proceso/workflows/multimedia/p07-revisar/workflow.yml`

Solo bajo demanda:

- `01_intencion/program/test-strategy.md`

Diferir:

- `Código mutable fuera del candidate`

## 4. Routing, workflow y skills

Rutas: `R6`  
Workflows: `P07`  
Skills primarias: `dev-verification-before-completion`

## 5. Tools, efectos y write policy

Tools: `review_read_only`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/workflows/multimedia/p07-revisar/workflow.yml`

Write set:

- `02_proceso/workflows/multimedia/p07-revisar/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `quality_verdict`  
Stop rules: UNKNOWN bloquea · Verifier no remedia

Hijos:

- Ninguno; devolver handoff al contexto padre.
