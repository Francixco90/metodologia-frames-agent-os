<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-PROCESS
-->

# Contexto: 02_proceso

## 1. Propósito y activación

Diseñar o ejecutar gobierno, agentes, core y workflows.

## 2. Autoridad y precedencia

Owner: `governance`. Cargar en este orden:

- `AGENTS.md`
- `02_proceso/governance/experience-first-orchestration.md`

## 3. Carga mínima y contexto diferido

Primero:

- `AGENTS.md`
- `02_proceso/governance/router.yml`

Solo bajo demanda:

- `02_proceso/governance/experience-first-orchestration.md`

Diferir:

- `Familias de workflow no bloqueadas`

## 4. Routing, workflow y skills

Rutas: `R0`, `R4`, `R6`, `R7`  
Workflows: `ninguno`  
Skills primarias: `content-os-router`

## 5. Tools, efectos y write policy

Tools: `route_lock`, `work_order`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/governance/router.yml`

Write set:

- `02_proceso/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `route_lock`, `ownership`  
Stop rules: No inventar workflow · skill · output ni gate

Hijos:

- `CTX-GOVERNANCE`
- `CTX-CORE`
- `CTX-AGENTS`
- `CTX-COMMITTEES`
- `CTX-WORKFLOWS`
