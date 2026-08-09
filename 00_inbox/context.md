<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-INBOX
-->

# Contexto: 00_inbox

## 1. Propósito y activación

Ingesta autorizada de fuentes, contratos, firmas, muestras o templates.

## 2. Autoridad y precedencia

Owner: `sources`. Cargar en este orden:

- `AGENTS.md`
- `04_estado/registries/sources/source-registry.yml`

## 3. Carga mínima y contexto diferido

Primero:

- `AGENTS.md`
- `04_estado/registries/sources/source-registry.yml`

Solo bajo demanda:

- `02_proceso/governance/tool-policy.yml`

Diferir:

- `Archivos no seleccionados`
- `datos privados sin route lock`

## 4. Routing, workflow y skills

Rutas: `R6`, `R7`  
Workflows: `P01`, `P02`, `C00`, `C01`  
Skills primarias: `ninguna`

## 5. Tools, efectos y write policy

Tools: `read_only_ingest`  
Modo: `generated_only`. Read set mínimo:

- `04_estado/registries/sources/source-registry.yml`

Write set:

- `00_inbox/context.md`

Privacidad: `private_after_route_lock`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `source_authority`  
Stop rules: Fuente sin procedencia o derechos queda UNKNOWN

Hijos:

- Ninguno; devolver handoff al contexto padre.
