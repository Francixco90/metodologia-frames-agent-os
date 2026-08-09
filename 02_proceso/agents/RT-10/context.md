<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-RT-10
-->

# Contexto: 02_proceso/agents/RT-10

## 1. Propósito y activación

Implementar runtime, adapters, ACL, receipts, retry o kill switch.

## 2. Autoridad y precedencia

Owner: `agents-committee`. Cargar en este orden:

- `02_proceso/agents/RT-10/contract.yml`

## 3. Carga mínima y contexto diferido

Primero:

- `02_proceso/agents/RT-10/contract.yml`

Solo bajo demanda:

- `02_proceso/governance/tool-policy.yml`

Diferir:

- `Conectores y efectos externos`

## 4. Routing, workflow y skills

Rutas: `R4`, `R6`, `R7`  
Workflows: `ninguno`  
Skills primarias: `content-os-core`

## 5. Tools, efectos y write policy

Tools: `runtime`, `dry_run`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/agents/RT-10/contract.yml`

Write set:

- `02_proceso/agents/RT-10/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `execution_authz`, `receipt`  
Stop rules: Dry-run cero writes · Efectos externos denegados

Hijos:

- Ninguno; devolver handoff al contexto padre.
