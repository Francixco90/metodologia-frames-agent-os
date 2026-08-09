<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-RT-09
-->
# Contexto: 02_proceso/agents/RT-09

## 1. Propósito y activación

Verificar un candidate congelado de forma independiente y read-only.

## 2. Autoridad y precedencia

Owner: `agents-committee`. Cargar en este orden:
- `02_proceso/agents/RT-09/contract.yml`

## 3. Carga mínima y contexto diferido

Primero:
- `02_proceso/agents/RT-09/contract.yml`

Solo bajo demanda:
- `01_intencion/program/test-strategy.md`

Diferir:
- `Contexto del producer no necesario para verificar`

## 4. Routing, workflow y skills

Rutas: `ninguna`  
Workflows: `P07`, `C08`  
Skills primarias: `dev-verification-before-completion`

## 5. Tools, efectos y write policy

Tools: `verify_read_only`  
Modo: `generated_only`. Read set mínimo:
- `02_proceso/agents/RT-09/contract.yml`

Write set:
- `02_proceso/agents/RT-09/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `candidate_freeze`, `verification`  
Stop rules: REVISE crea successor · Verifier no remedia

Hijos:
- Ninguno; devolver handoff al contexto padre.
