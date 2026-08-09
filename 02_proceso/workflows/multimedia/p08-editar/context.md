<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-P08
-->
# Contexto: 02_proceso/workflows/multimedia/p08-editar

## 1. Propósito y activación

Un veredicto exige editar, comparar y crear un candidate successor.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:
- `02_proceso/workflows/multimedia/p08-editar/workflow.yml`

## 3. Carga mínima y contexto diferido

Primero:
- `02_proceso/workflows/multimedia/p08-editar/workflow.yml`

Solo bajo demanda:
- `01_intencion/program/test-strategy.md`

Diferir:
- `Cambios fuera del veredicto`

## 4. Routing, workflow y skills

Rutas: `R6`  
Workflows: `P08`  
Skills primarias: `content-os-creative`

## 5. Tools, efectos y write policy

Tools: `edit`, `regression`  
Modo: `generated_only`. Read set mínimo:
- `02_proceso/workflows/multimedia/p08-editar/workflow.yml`

Write set:
- `02_proceso/workflows/multimedia/p08-editar/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `successor_candidate`  
Stop rules: No sobrescribir candidate congelado

Hijos:
- Ninguno; devolver handoff al contexto padre.
