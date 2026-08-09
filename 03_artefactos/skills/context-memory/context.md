<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-SKILL-CONTEXT-MEMORY
-->

# Contexto: 03_artefactos/skills/context-memory

## 1. Propósito y activación

Una decisión durable y autorizada aporta continuidad entre sesiones.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:

- `03_artefactos/skills/context-memory/SKILL.md`

## 3. Carga mínima y contexto diferido

Primero:

- `03_artefactos/skills/context-memory/SKILL.md`

Solo bajo demanda:

- `03_artefactos/skills/context-memory/LINEAGE.yml`

Diferir:

- `Trazas de sesión`
- `razonamiento privado y datos transitorios`

## 4. Routing, workflow y skills

Rutas: `R4`  
Workflows: `ninguno`  
Skills primarias: `context-memory`

## 5. Tools, efectos y write policy

Tools: `memory_supersedes`  
Modo: `generated_only`. Read set mínimo:

- `03_artefactos/skills/context-memory/SKILL.md`

Write set:

- `03_artefactos/skills/context-memory/context.md`

Privacidad: `private_after_route_lock`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `consent`, `durable_fact`  
Stop rules: No convertir inferencias en hechos · Nueva verdad crea supersedes

Hijos:

- Ninguno; devolver handoff al contexto padre.
