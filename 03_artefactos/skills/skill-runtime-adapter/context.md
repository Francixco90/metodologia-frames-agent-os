<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-SKILL-RUNTIME-ADAPTER
-->

# Contexto: 03_artefactos/skills/skill-runtime-adapter

## 1. Propósito y activación

S04 o S08 compila el core portable para un runtime específico.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:

- `03_artefactos/skills/skill-runtime-adapter/SKILL.md`

## 3. Carga mínima y contexto diferido

Primero:

- `03_artefactos/skills/skill-runtime-adapter/SKILL.md`

Solo bajo demanda:

- `03_artefactos/skills/skill-runtime-adapter/references/operating-contract.md`

Diferir:

- `Adapters y hosts no seleccionados`

## 4. Routing, workflow y skills

Rutas: `R8`, `R9`  
Workflows: `S04`, `S08`  
Skills primarias: `skill-runtime-adapter`

## 5. Tools, efectos y write policy

Tools: `skills:validate`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/workflows/skill-systems/contracts.ts`

Write set:

- `03_artefactos/skills/skill-runtime-adapter/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `SSS_RELEASE_CANDIDATE`  
Stop rules: Host sin probe material permanece UNKNOWN

Hijos:

- Ninguno; devolver handoff al contexto padre.
