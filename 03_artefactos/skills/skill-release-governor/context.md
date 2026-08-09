<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-SKILL-RELEASE-GOVERNOR
-->

# Contexto: 03_artefactos/skills/skill-release-governor

## 1. Propósito y activación

S08 o S09 congela capsule restore lifecycle y compatibilidad.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:

- `03_artefactos/skills/skill-release-governor/SKILL.md`

## 3. Carga mínima y contexto diferido

Primero:

- `03_artefactos/skills/skill-release-governor/SKILL.md`

Solo bajo demanda:

- `03_artefactos/skills/skill-release-governor/references/operating-contract.md`

Diferir:

- `Hosts sin adapter seleccionado`

## 4. Routing, workflow y skills

Rutas: `R9`  
Workflows: `S08`, `S09`  
Skills primarias: `skill-release-governor`

## 5. Tools, efectos y write policy

Tools: `skills:package`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/workflows/skill-systems/contracts.ts`

Write set:

- `03_artefactos/skills/skill-release-governor/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `SSS_RELEASE_CANDIDATE`, `DOCS_TRANSVERSAL_COMPLETE`  
Stop rules: Capsule no se sobrescribe y H01 permanece separado

Hijos:

- Ninguno; devolver handoff al contexto padre.
