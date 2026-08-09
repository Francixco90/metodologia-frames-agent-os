<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-EXPERIENCE
-->

# Contexto: 02_proceso/workflows/experience

## 1. Propósito y activación

Componer First-Turn Gateway, GenUI, hospitalidad, recovery o releases de experiencia.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:

- `AGENTS.md`
- `02_proceso/governance/experience-first-orchestration.md`

## 3. Carga mínima y contexto diferido

Primero:

- `02_proceso/governance/experience-first-orchestration.md`

Solo bajo demanda:

- `02_proceso/workflows/experience/component-registry.yml`
- `02_proceso/workflows/experience/service-blueprint.yml`

Diferir:

- `Componentes no seleccionados y contexto privado antes de route lock`

## 4. Routing, workflow y skills

Rutas: `R0`, `R4`, `R6`, `R7`  
Workflows: `ninguno`  
Skills primarias: `content-os-router`

## 5. Tools, efectos y write policy

Tools: `experience_view`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/governance/experience-first-orchestration.md`

Write set:

- `02_proceso/workflows/experience/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `semantic_parity`, `accessibility`  
Stop rules: Texto libre prevalece · Ghost menu no entra al entregable

Hijos:

- Ninguno; devolver handoff al contexto padre.
