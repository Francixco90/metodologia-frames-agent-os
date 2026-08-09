<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-RT-08
-->

# Contexto: 02_proceso/agents/RT-08

## 1. Propósito y activación

Validar schemas, estados, métricas y compatibilidad.

## 2. Autoridad y precedencia

Owner: `agents-committee`. Cargar en este orden:

- `02_proceso/agents/RT-08/contract.yml`

## 3. Carga mínima y contexto diferido

Primero:

- `02_proceso/agents/RT-08/contract.yml`

Solo bajo demanda:

- `02_proceso/core/contracts/index.ts`

Diferir:

- `Schemas no afectados`

## 4. Routing, workflow y skills

Rutas: `R6`, `R7`  
Workflows: `ninguno`  
Skills primarias: `content-os-core`

## 5. Tools, efectos y write policy

Tools: `schema_check`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/agents/RT-08/contract.yml`

Write set:

- `02_proceso/agents/RT-08/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `schema`, `compatibility`  
Stop rules: Transición no enumerada bloquea

Hijos:

- Ninguno; devolver handoff al contexto padre.
