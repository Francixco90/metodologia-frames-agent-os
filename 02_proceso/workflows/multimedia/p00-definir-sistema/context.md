<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-P00
-->

# Contexto: 02_proceso/workflows/multimedia/p00-definir-sistema

## 1. Propósito y activación

Falta identidad, voz, canal o sistema visual para una pieza nueva.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:

- `02_proceso/workflows/multimedia/p00-definir-sistema/workflow.yml`

## 3. Carga mínima y contexto diferido

Primero:

- `02_proceso/workflows/multimedia/p00-definir-sistema/workflow.yml`

Solo bajo demanda:

- `03_artefactos/brand/brand-profile.yml`

Diferir:

- `Producción de activos`

## 4. Routing, workflow y skills

Rutas: `R6`  
Workflows: `P00`  
Skills primarias: `metodologia-brand-router`

## 5. Tools, efectos y write policy

Tools: `brand_resolve`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/workflows/multimedia/p00-definir-sistema/workflow.yml`

Write set:

- `02_proceso/workflows/multimedia/p00-definir-sistema/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `brand_system`  
Stop rules: Marca o derechos no resueltos bloquean

Hijos:

- Ninguno; devolver handoff al contexto padre.
