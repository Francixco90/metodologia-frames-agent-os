<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-WORKFLOW-ADAPTERS
-->
# Contexto: 02_proceso/workflows/adapters

## 1. Propósito y activación

Proyectar un workflow canónico hacia un adapter autorizado.

## 2. Autoridad y precedencia

Owner: `n8n`. Cargar en este orden:
- `AGENTS.md`
- `02_proceso/governance/agent-cli-adapters.md`

## 3. Carga mínima y contexto diferido

Primero:
- `02_proceso/governance/agent-cli-adapters.md`

Solo bajo demanda:
- `02_proceso/governance/tool-policy.yml`

Diferir:
- `Hosts y conectores no seleccionados`

## 4. Routing, workflow y skills

Rutas: `R6`, `R7`  
Workflows: `ninguno`  
Skills primarias: `ninguna`

## 5. Tools, efectos y write policy

Tools: `adapter_probe`  
Modo: `generated_only`. Read set mínimo:
- `02_proceso/governance/agent-cli-adapters.md`

Write set:
- `02_proceso/workflows/adapters/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `adapter_conformance`  
Stop rules: Sin probe material la compatibilidad queda UNKNOWN

Hijos:
- Ninguno; devolver handoff al contexto padre.
