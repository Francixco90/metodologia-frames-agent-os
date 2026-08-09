<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-SKILL-ECOSYSTEM-INVENTORY
-->

# Contexto: 03_artefactos/skills/frames-ecosystem-inventory

## 1. Propósito y activación

Se necesita reconciliar capacidades canónicas y locales sin mezclar privacidad.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:

- `03_artefactos/skills/frames-ecosystem-inventory/SKILL.md`

## 3. Carga mínima y contexto diferido

Primero:

- `03_artefactos/skills/frames-ecosystem-inventory/SKILL.md`

Solo bajo demanda:

- `03_artefactos/skills/frames-ecosystem-inventory/references/operating-contract.md`

Diferir:

- `Contenido privado de extensiones`

## 4. Routing, workflow y skills

Rutas: `R8`, `R9`  
Workflows: `M00`, `M05`  
Skills primarias: `frames-ecosystem-inventory`

## 5. Tools, efectos y write policy

Tools: `ecosystem_inventory`  
Modo: `generated_only`. Read set mínimo:

- `03_artefactos/skills/frames-ecosystem-inventory/SKILL.md`

Write set:

- `03_artefactos/skills/frames-ecosystem-inventory/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `DOCS_TRANSVERSAL_COMPLETE`  
Stop rules: Inventario público excluye local · ID duplicado bloquea

Hijos:

- Ninguno; devolver handoff al contexto padre.
