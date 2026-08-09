<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-SKILL-LOCAL-EXTENSION-FOUNDRY
-->

# Contexto: 03_artefactos/skills/frames-local-extension-foundry

## 1. Propósito y activación

R8 requiere diseñar validar o activar una extensión privada.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:

- `03_artefactos/skills/frames-local-extension-foundry/SKILL.md`

## 3. Carga mínima y contexto diferido

Primero:

- `03_artefactos/skills/frames-local-extension-foundry/SKILL.md`

Solo bajo demanda:

- `03_artefactos/skills/frames-local-extension-foundry/references/operating-contract.md`

Diferir:

- `Otras extensiones y locators privados`

## 4. Routing, workflow y skills

Rutas: `R8`  
Workflows: `L00`, `L01`, `L02`, `L03`, `L04`, `L05`  
Skills primarias: `frames-local-extension-foundry`

## 5. Tools, efectos y write policy

Tools: `frames_extend`  
Modo: `generated_only`. Read set mínimo:

- `03_artefactos/skills/frames-local-extension-foundry/SKILL.md`

Write set:

- `03_artefactos/skills/frames-local-extension-foundry/context.md`

Privacidad: `private_after_route_lock`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `LX_BRIEF_APPROVED`  
Stop rules: Nunca reemplazar canónico · Sandbox faltante bloquea código

Hijos:

- Ninguno; devolver handoff al contexto padre.
