<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-RT-11
-->
# Contexto: 02_proceso/agents/RT-11

## 1. Propósito y activación

Auditar gobierno, independencia, privacidad y fail-closed sin remediar.

## 2. Autoridad y precedencia

Owner: `agents-committee`. Cargar en este orden:
- `02_proceso/agents/RT-11/contract.yml`

## 3. Carga mínima y contexto diferido

Primero:
- `02_proceso/agents/RT-11/contract.yml`

Solo bajo demanda:
- `02_proceso/governance/experience-first-orchestration.md`

Diferir:
- `Código mutable y razonamiento privado`

## 4. Routing, workflow y skills

Rutas: `ninguna`  
Workflows: `ninguno`  
Skills primarias: `ninguna`

## 5. Tools, efectos y write policy

Tools: `guardian_read_only`  
Modo: `generated_only`. Read set mínimo:
- `02_proceso/agents/RT-11/contract.yml`

Write set:
- `02_proceso/agents/RT-11/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `guardian`  
Stop rules: Guardian no remedia ni autoaprueba

Hijos:
- Ninguno; devolver handoff al contexto padre.
