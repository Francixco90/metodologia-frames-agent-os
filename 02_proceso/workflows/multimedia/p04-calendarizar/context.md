<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-P04
-->
# Contexto: 02_proceso/workflows/multimedia/p04-calendarizar

## 1. Propósito y activación

El pedido incluye serie, campaña, calendario o múltiples entregables.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:
- `02_proceso/workflows/multimedia/p04-calendarizar/workflow.yml`

## 3. Carga mínima y contexto diferido

Primero:
- `02_proceso/workflows/multimedia/p04-calendarizar/workflow.yml`

Solo bajo demanda:
- `02_proceso/workflows/multimedia/_assets/deliverable-definition-registry.yml`

Diferir:
- `Canales y piezas no seleccionados`

## 4. Routing, workflow y skills

Rutas: `R6`  
Workflows: `P04`  
Skills primarias: `content-os-creative`

## 5. Tools, efectos y write policy

Tools: `schedule_plan`  
Modo: `generated_only`. Read set mínimo:
- `02_proceso/workflows/multimedia/p04-calendarizar/workflow.yml`

Write set:
- `02_proceso/workflows/multimedia/p04-calendarizar/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `capacity`  
Stop rules: Dependencia o capacidad desconocida queda visible

Hijos:
- Ninguno; devolver handoff al contexto padre.
