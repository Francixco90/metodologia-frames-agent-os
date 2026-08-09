<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-P01
-->

# Contexto: 02_proceso/workflows/multimedia/p01-curar-material

## 1. Propósito y activación

Existen materiales que deben inventariarse, verificarse y seleccionarse.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:

- `02_proceso/workflows/multimedia/p01-curar-material/workflow.yml`

## 3. Carga mínima y contexto diferido

Primero:

- `02_proceso/workflows/multimedia/p01-curar-material/workflow.yml`

Solo bajo demanda:

- `04_estado/registries/sources/source-registry.yml`

Diferir:

- `Material no seleccionado`

## 4. Routing, workflow y skills

Rutas: `R6`  
Workflows: `P01`  
Skills primarias: `content-os-core`

## 5. Tools, efectos y write policy

Tools: `source_check`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/workflows/multimedia/p01-curar-material/workflow.yml`

Write set:

- `02_proceso/workflows/multimedia/p01-curar-material/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `source_authority`, `rights`  
Stop rules: Gap de derechos queda UNKNOWN

Hijos:

- Ninguno; devolver handoff al contexto padre.
