<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-SKILL-SYSTEM-ARCHITECT
-->

# Contexto: 03_artefactos/skills/skill-system-architect

## 1. Propósito y activación

R8 o R9 necesita Skill Case demotion topología o Architecture Decision.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:

- `03_artefactos/skills/skill-system-architect/SKILL.md`

## 3. Carga mínima y contexto diferido

Primero:

- `03_artefactos/skills/skill-system-architect/SKILL.md`

Solo bajo demanda:

- `03_artefactos/skills/skill-system-architect/references/operating-contract.md`

Diferir:

- `Autoría evaluación y release`

## 4. Routing, workflow y skills

Rutas: `R8`, `R9`  
Workflows: `S00`, `S01`, `S02`  
Skills primarias: `skill-system-architect`

## 5. Tools, efectos y write policy

Tools: `skills:inspect`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/workflows/skill-systems/contracts.ts`

Write set:

- `03_artefactos/skills/skill-system-architect/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `SSS_CASE_READY`, `SSS_ARCHITECTURE_READY`  
Stop rules: Elegir el componente suficiente más pequeño

Hijos:

- Ninguno; devolver handoff al contexto padre.
