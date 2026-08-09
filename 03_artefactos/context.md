<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-ARTIFACTS
-->
# Contexto: 03_artefactos

## 1. Propósito y activación

Resolver outputs, adapters, marca, proyectos, renderers o skills ya seleccionados.

## 2. Autoridad y precedencia

Owner: `lead`. Cargar en este orden:
- `AGENTS.md`
- `01_intencion/program/ownership-manifest.yml`

## 3. Carga mínima y contexto diferido

Primero:
- `AGENTS.md`
- `01_intencion/program/ownership-manifest.yml`

Solo bajo demanda:
- `02_proceso/governance/tool-policy.yml`

Diferir:
- `Skills no vinculadas`
- `proyectos ajenos y outputs privados`

## 4. Routing, workflow y skills

Rutas: `R6`, `R7`  
Workflows: `ninguno`  
Skills primarias: `ninguna`

## 5. Tools, efectos y write policy

Tools: `owner_scoped_write`  
Modo: `generated_only`. Read set mínimo:
- `01_intencion/program/ownership-manifest.yml`

Write set:
- `03_artefactos/context.md`

Privacidad: `private_after_route_lock`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `ownership`, `budget`  
Stop rules: Un writer por ruta · Editar fuente y regenerar derivados

Hijos:
- `CTX-HOST-ADAPTERS`
