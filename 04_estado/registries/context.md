<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-REGISTRIES
-->
# Contexto: 04_estado/registries

## 1. Propósito y activación

Resolver IDs, capacidades, owners y referencias canónicas después del route lock.

## 2. Autoridad y precedencia

Owner: `governance`. Cargar en este orden:
- `AGENTS.md`
- `02_proceso/governance/router.yml`

## 3. Carga mínima y contexto diferido

Primero:
- `02_proceso/governance/router.yml`

Solo bajo demanda:
- `04_estado/registries/agents/agent-registry-v2.yml`
- `04_estado/registries/skills/creation-v3-skill-registry.yml`

Diferir:
- `Registries no requeridos por el paso activo`

## 4. Routing, workflow y skills

Rutas: `R2`, `R4`, `R6`, `R7`  
Workflows: `ninguno`  
Skills primarias: `content-os-router`

## 5. Tools, efectos y write policy

Tools: `registry_resolve`  
Modo: `generated_only`. Read set mínimo:
- `02_proceso/governance/router.yml`

Write set:
- `04_estado/registries/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `referential_integrity`  
Stop rules: Referencia cero o múltiple queda UNKNOWN

Hijos:
- Ninguno; devolver handoff al contexto padre.
