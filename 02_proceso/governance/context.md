<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-GOVERNANCE
-->

# Contexto: 02_proceso/governance

## 1. Propósito y activación

Resolver precedencia, routing, tools, budgets, privacidad o promoción.

## 2. Autoridad y precedencia

Owner: `governance`. Cargar en este orden:

- `AGENTS.md`
- `02_proceso/governance/router.yml`

## 3. Carga mínima y contexto diferido

Primero:

- `AGENTS.md`
- `02_proceso/governance/router.yml`

Solo bajo demanda:

- `02_proceso/governance/experience-first-orchestration.md`
- `02_proceso/governance/tool-policy.yml`
- `02_proceso/governance/docs-budget-policy.yml`

Diferir:

- `Políticas no afectadas y evidencia histórica`

## 4. Routing, workflow y skills

Rutas: `R0`, `R1`, `R2`, `R3`, `R3-LOOSE`, `R4`, `R5`, `R6`, `R7`, `R8`, `R9`, `R10`  
Workflows: `ninguno`  
Skills primarias: `content-os-router`

## 5. Tools, efectos y write policy

Tools: `policy_check`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/governance/router.yml`
- `01_intencion/program/ownership-manifest.yml`

Write set:

- `02_proceso/governance/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `authority`, `ownership`, `budget`  
Stop rules: La interpretación más restrictiva prevalece

Hijos:

- Ninguno; devolver handoff al contexto padre.
