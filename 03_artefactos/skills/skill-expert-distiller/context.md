<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-SKILL-EXPERT-DISTILLER
-->

# Contexto: 03_artefactos/skills/skill-expert-distiller

## 1. Propósito y activación

Práctica experta debe convertirse en reglas y oráculos trazables.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:

- `03_artefactos/skills/skill-expert-distiller/SKILL.md`

## 3. Carga mínima y contexto diferido

Primero:

- `03_artefactos/skills/skill-expert-distiller/SKILL.md`

Solo bajo demanda:

- `03_artefactos/skills/skill-expert-distiller/references/operating-contract.md`

Diferir:

- `Material experto no seleccionado`

## 4. Routing, workflow y skills

Rutas: `R8`, `R9`  
Workflows: `S00`, `S03`  
Skills primarias: `skill-expert-distiller`

## 5. Tools, efectos y write policy

Tools: `skills:inspect`  
Modo: `generated_only`. Read set mínimo:

- `00_inbox/first-party/SRC-SKILL-SYSTEMS-PRD-V1.projection.yml`

Write set:

- `03_artefactos/skills/skill-expert-distiller/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `SSS_CASE_READY`  
Stop rules: Preferencia no se vuelve regla sin evidencia

Hijos:

- Ninguno; devolver handoff al contexto padre.
