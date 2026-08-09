<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-SKILL-FRAMES-DOCS-AS-CODE
-->

# Contexto: 03_artefactos/skills/frames-docs-as-code

## 1. Propósito y activación

Un cambio exige documentación y proyecciones sincronizadas.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:

- `03_artefactos/skills/frames-docs-as-code/SKILL.md`

## 3. Carga mínima y contexto diferido

Primero:

- `03_artefactos/skills/frames-docs-as-code/SKILL.md`

Solo bajo demanda:

- `03_artefactos/skills/frames-docs-as-code/references/operating-contract.md`

Diferir:

- `Páginas no afectadas`

## 4. Routing, workflow y skills

Rutas: `R9`  
Workflows: `M05`  
Skills primarias: `frames-docs-as-code`

## 5. Tools, efectos y write policy

Tools: `documentation_generator`  
Modo: `generated_only`. Read set mínimo:

- `03_artefactos/skills/frames-docs-as-code/SKILL.md`

Write set:

- `03_artefactos/skills/frames-docs-as-code/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `DOCS_TRANSVERSAL_COMPLETE`  
Stop rules: Sin paridad y hashes no cerrar

Hijos:

- Ninguno; devolver handoff al contexto padre.
