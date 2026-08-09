<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-SKILL-EVALUATION-ENGINEER
-->

# Contexto: 03_artefactos/skills/skill-evaluation-engineer

## 1. Propósito y activación

S03 o S06 necesita baseline casos assertions y replay.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:

- `03_artefactos/skills/skill-evaluation-engineer/SKILL.md`

## 3. Carga mínima y contexto diferido

Primero:

- `03_artefactos/skills/skill-evaluation-engineer/SKILL.md`

Solo bajo demanda:

- `03_artefactos/skills/skill-evaluation-engineer/references/operating-contract.md`

Diferir:

- `Casos fuera del corpus activo`

## 4. Routing, workflow y skills

Rutas: `R8`, `R9`  
Workflows: `S03`, `S06`  
Skills primarias: `skill-evaluation-engineer`

## 5. Tools, efectos y write policy

Tools: `skills:evaluate`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/workflows/skill-systems/contracts.ts`

Write set:

- `03_artefactos/skills/skill-evaluation-engineer/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `SSS_EVAL_VALIDATED`  
Stop rules: Infraestructura fallida no entra al denominador

Hijos:

- Ninguno; devolver handoff al contexto padre.
