<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-SKILL-AUTHORING-ENGINEER
-->

# Contexto: 03_artefactos/skills/skill-authoring-engineer

## 1. Propósito y activación

S04 tiene contratos aprobados y WorkOrder material.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:

- `03_artefactos/skills/skill-authoring-engineer/SKILL.md`

## 3. Carga mínima y contexto diferido

Primero:

- `03_artefactos/skills/skill-authoring-engineer/SKILL.md`

Solo bajo demanda:

- `03_artefactos/skills/skill-authoring-engineer/references/operating-contract.md`

Diferir:

- `Portfolio completo y releases`

## 4. Routing, workflow y skills

Rutas: `R8`, `R9`  
Workflows: `S04`  
Skills primarias: `skill-authoring-engineer`

## 5. Tools, efectos y write policy

Tools: `skills:scaffold`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/workflows/skill-systems/contracts.ts`

Write set:

- `03_artefactos/skills/skill-authoring-engineer/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `SSS_CANDIDATE_READY`  
Stop rules: Sin WorkOrder dry-run y cero writes

Hijos:

- Ninguno; devolver handoff al contexto padre.
