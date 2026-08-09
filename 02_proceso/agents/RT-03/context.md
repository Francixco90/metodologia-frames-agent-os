<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-RT-03
-->

# Contexto: 02_proceso/agents/RT-03

## 1. Propósito y activación

Revisar derechos, licencias, privacidad y restricciones de uso.

## 2. Autoridad y precedencia

Owner: `agents-committee`. Cargar en este orden:

- `02_proceso/agents/RT-03/contract.yml`

## 3. Carga mínima y contexto diferido

Primero:

- `02_proceso/agents/RT-03/contract.yml`

Solo bajo demanda:

- `02_proceso/governance/tool-policy.yml`

Diferir:

- `Activos no seleccionados`

## 4. Routing, workflow y skills

Rutas: `ninguna`  
Workflows: `P01`, `P07`, `C08`  
Skills primarias: `ninguna`

## 5. Tools, efectos y write policy

Tools: `rights_check`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/agents/RT-03/contract.yml`

Write set:

- `02_proceso/agents/RT-03/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `rights`, `privacy`  
Stop rules: Derechos o privacidad desconocidos bloquean

Hijos:

- Ninguno; devolver handoff al contexto padre.
