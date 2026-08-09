<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-SKILL-TOKEN-EFFICIENCY
-->
# Contexto: 03_artefactos/skills/frames-token-efficiency-orchestrator

## 1. Propósito y activación

La ruta permite optimizar contexto medido sin degradar marca evidencia o calidad.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:
- `03_artefactos/skills/frames-token-efficiency-orchestrator/SKILL.md`

## 3. Carga mínima y contexto diferido

Primero:
- `03_artefactos/skills/frames-token-efficiency-orchestrator/SKILL.md`

Solo bajo demanda:
- `03_artefactos/skills/frames-token-efficiency-orchestrator/LINEAGE.yml`

Diferir:
- `Sidecars no activados`
- `perfiles humanos y contenido publicable`

## 4. Routing, workflow y skills

Rutas: `R0`, `R4`, `R6`, `R7`  
Workflows: `ninguno`  
Skills primarias: `frames-token-efficiency-orchestrator`

## 5. Tools, efectos y write policy

Tools: `one_transformer`, `one_observer`  
Modo: `generated_only`. Read set mínimo:
- `03_artefactos/skills/frames-token-efficiency-orchestrator/SKILL.md`

Write set:
- `03_artefactos/skills/frames-token-efficiency-orchestrator/context.md`

Privacidad: `private_after_route_lock`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `token_policy`, `raw_evidence`  
Stop rules: Opt-in únicamente · Preservar evidencia raw y rollback

Hijos:
- Ninguno; devolver handoff al contexto padre.
