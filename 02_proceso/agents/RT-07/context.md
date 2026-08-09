<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-RT-07
-->

# Contexto: 02_proceso/agents/RT-07

## 1. Propósito y activación

Materializar, renderizar y verificar outputs multimedia deterministas.

## 2. Autoridad y precedencia

Owner: `agents-committee`. Cargar en este orden:

- `02_proceso/agents/RT-07/contract.yml`

## 3. Carga mínima y contexto diferido

Primero:

- `02_proceso/agents/RT-07/contract.yml`

Solo bajo demanda:

- `02_proceso/workflows/multimedia/_runner`

Diferir:

- `Renderers no seleccionados`

## 4. Routing, workflow y skills

Rutas: `R6`  
Workflows: `P06`, `P08`  
Skills primarias: `ninguna`

## 5. Tools, efectos y write policy

Tools: `render`, `replay`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/agents/RT-07/contract.yml`

Write set:

- `02_proceso/agents/RT-07/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `material_output`, `deterministic_replay`  
Stop rules: Hash solo de archivo materializado

Hijos:

- Ninguno; devolver handoff al contexto padre.
