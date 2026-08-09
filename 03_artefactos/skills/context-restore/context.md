<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-SKILL-CONTEXT-RESTORE
-->

# Contexto: 03_artefactos/skills/context-restore

## 1. Propósito y activación

Una petición de continuar debe resolver exactamente un lineage verificable.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:

- `03_artefactos/skills/context-restore/SKILL.md`

## 3. Carga mínima y contexto diferido

Primero:

- `03_artefactos/skills/context-restore/SKILL.md`

Solo bajo demanda:

- `03_artefactos/skills/context-restore/LINEAGE.yml`

Diferir:

- `Candidates no seleccionados y contexto privado no ligado`

## 4. Routing, workflow y skills

Rutas: `R4`  
Workflows: `ninguno`  
Skills primarias: `context-restore`

## 5. Tools, efectos y write policy

Tools: `lineage_resolver`, `hash_read_back`  
Modo: `generated_only`. Read set mínimo:

- `03_artefactos/skills/context-restore/SKILL.md`

Write set:

- `03_artefactos/skills/context-restore/context.md`

Privacidad: `private_after_route_lock`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `resume_lineage`  
Stop rules: Cardinalidad cero o N bloquea · Symlink o hash stale bloquea

Hijos:

- Ninguno; devolver handoff al contexto padre.
