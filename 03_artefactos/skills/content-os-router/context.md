<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-SKILL-CONTENT-ROUTER
-->
# Contexto: 03_artefactos/skills/content-os-router

## 1. Propósito y activación

Clasificar lenguaje normal, fijar R6/R7/R4 o devolver una aclaración fail-closed.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:
- `03_artefactos/skills/content-os-router/SKILL.md`
- `02_proceso/governance/router.yml`

## 3. Carga mínima y contexto diferido

Primero:
- `03_artefactos/skills/content-os-router/SKILL.md`
- `02_proceso/governance/router.yml`

Solo bajo demanda:
- `03_artefactos/skills/content-os-router/LINEAGE.yml`

Diferir:
- `Workflows no seleccionados`
- `templates`
- `corpus y estado privado`

## 4. Routing, workflow y skills

Rutas: `R0`, `R4`, `R6`, `R7`  
Workflows: `P00-P09`, `C00-C09`  
Skills primarias: `content-os-router`

## 5. Tools, efectos y write policy

Tools: `frames:assist`, `route_lock`  
Modo: `generated_only`. Read set mínimo:
- `03_artefactos/skills/content-os-router/SKILL.md`
- `02_proceso/governance/router.yml`

Write set:
- `03_artefactos/skills/content-os-router/context.md`

Privacidad: `private_after_route_lock`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `route_lock`, `EXP_BRIEF_APPROVED`  
Stop rules: Empate material bloquea · Skill sin receipt permanece planned

Hijos:
- Ninguno; devolver handoff al contexto padre.
