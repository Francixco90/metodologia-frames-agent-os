<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-P05
-->
# Contexto: 02_proceso/workflows/multimedia/p05-disenar-pieza

## 1. Propósito y activación

Antes de producir, convertir el brief en especificación creativa ejecutable.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:
- `02_proceso/workflows/multimedia/p05-disenar-pieza/workflow.yml`

## 3. Carga mínima y contexto diferido

Primero:
- `02_proceso/workflows/multimedia/p05-disenar-pieza/workflow.yml`

Solo bajo demanda:
- `02_proceso/workflows/multimedia/_assets/deliverable-definition-registry.yml`

Diferir:
- `Templates de piezas no seleccionadas`

## 4. Routing, workflow y skills

Rutas: `R6`  
Workflows: `P05`  
Skills primarias: `content-os-creative`

## 5. Tools, efectos y write policy

Tools: `creative_spec`  
Modo: `generated_only`. Read set mínimo:
- `02_proceso/workflows/multimedia/p05-disenar-pieza/workflow.yml`

Write set:
- `02_proceso/workflows/multimedia/p05-disenar-pieza/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `creative_readiness`  
Stop rules: Output sin template o cap explícito bloquea

Hijos:
- Ninguno; devolver handoff al contexto padre.
