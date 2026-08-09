<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-RT-01
-->

# Contexto: 02_proceso/agents/RT-01

## 1. Propósito y activación

Liderar alcance, task graph, work orders, integración y handoff.

## 2. Autoridad y precedencia

Owner: `agents-committee`. Cargar en este orden:

- `02_proceso/agents/RT-01/contract.yml`

## 3. Carga mínima y contexto diferido

Primero:

- `02_proceso/agents/RT-01/contract.yml`

Solo bajo demanda:

- `01_intencion/program/dag.yml`

Diferir:

- `Candidate freeze y veredictos independientes`

## 4. Routing, workflow y skills

Rutas: `ninguna`  
Workflows: `ninguno`  
Skills primarias: `dev-writing-plans`

## 5. Tools, efectos y write policy

Tools: `plan`, `handoff`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/agents/RT-01/contract.yml`

Write set:

- `02_proceso/agents/RT-01/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `work_order`  
Stop rules: Lead no verifica su propio candidate

Hijos:

- Ninguno; devolver handoff al contexto padre.
