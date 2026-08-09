<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-SKILL-CONTEXT-SAVE
-->
# Contexto: 03_artefactos/skills/context-save

## 1. Propósito y activación

El usuario autoriza conservar continuidad útil de una tarea o candidate.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:
- `03_artefactos/skills/context-save/SKILL.md`

## 3. Carga mínima y contexto diferido

Primero:
- `03_artefactos/skills/context-save/SKILL.md`

Solo bajo demanda:
- `03_artefactos/skills/context-save/LINEAGE.yml`

Diferir:
- `Conversación completa`
- `chain-of-thought`
- `secretos y PII innecesaria`

## 4. Routing, workflow y skills

Rutas: `R4`  
Workflows: `ninguno`  
Skills primarias: `context-save`

## 5. Tools, efectos y write policy

Tools: `private_append_only_state`  
Modo: `generated_only`. Read set mínimo:
- `03_artefactos/skills/context-save/SKILL.md`

Write set:
- `03_artefactos/skills/context-save/context.md`

Privacidad: `private_after_route_lock`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `consent`, `private_state`  
Stop rules: Sin consentimiento no persistir · Guardar decisiones no razonamiento privado

Hijos:
- Ninguno; devolver handoff al contexto padre.
