<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-CORE
-->

# Contexto: 02_proceso/core

## 1. Propósito y activación

Implementar contratos, estado, orquestación, evidencia o receipts del núcleo.

## 2. Autoridad y precedencia

Owner: `core`. Cargar en este orden:

- `AGENTS.md`
- `02_proceso/core/contracts/index.ts`

## 3. Carga mínima y contexto diferido

Primero:

- `AGENTS.md`
- `02_proceso/core/contracts/index.ts`

Solo bajo demanda:

- `01_intencion/program/dag.yml`

Diferir:

- `Adapters y familias no afectadas`

## 4. Routing, workflow y skills

Rutas: `R4`, `R6`, `R7`  
Workflows: `ninguno`  
Skills primarias: `content-os-core`

## 5. Tools, efectos y write policy

Tools: `typecheck`, `focused_tests`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/core/contracts/index.ts`
- `01_intencion/program/dag.yml`

Write set:

- `02_proceso/core/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `contract`, `state_transition`  
Stop rules: UNKNOWN bloquea · Cambios incompatibles exigen successor

Hijos:

- Ninguno; devolver handoff al contexto padre.
