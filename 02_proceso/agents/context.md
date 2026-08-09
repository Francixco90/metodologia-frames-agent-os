<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-AGENTS
-->

# Contexto: 02_proceso/agents

## 1. Propósito y activación

Contratar un officer registrado con perspectiva, tools y stop rule explícitos.

## 2. Autoridad y precedencia

Owner: `agents-committee`. Cargar en este orden:

- `AGENTS.md`
- `04_estado/registries/agents/agent-registry-v2.yml`

## 3. Carga mínima y contexto diferido

Primero:

- `AGENTS.md`
- `04_estado/registries/agents/agent-registry-v2.yml`

Solo bajo demanda:

- `02_proceso/governance/agent-cli-adapters.md`

Diferir:

- `Contratos de officers no contratados`

## 4. Routing, workflow y skills

Rutas: `ninguna`  
Workflows: `ninguno`  
Skills primarias: `ninguna`

## 5. Tools, efectos y write policy

Tools: `subagent`  
Modo: `generated_only`. Read set mínimo:

- `04_estado/registries/agents/agent-registry-v2.yml`

Write set:

- `02_proceso/agents/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `agent_identity`, `separation_of_duties`  
Stop rules: No simular delegación · Guardian no remedia

Hijos:

- `CTX-RT-01`
- `CTX-RT-02`
- `CTX-RT-03`
- `CTX-RT-04`
- `CTX-RT-05`
- `CTX-RT-06`
- `CTX-RT-07`
- `CTX-RT-08`
- `CTX-RT-09`
- `CTX-RT-10`
- `CTX-RT-11`
