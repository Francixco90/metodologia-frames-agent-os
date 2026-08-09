<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-LOCAL-EXTENSIONS
-->

# Contexto: 02_proceso/workflows/local-extensions

## 1. Propósito y activación

R8 resolvió crear o evolucionar una capacidad privada.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:

- `02_proceso/workflows/local-extensions/contracts.ts`

## 3. Carga mínima y contexto diferido

Primero:

- `02_proceso/workflows/local-extensions/intent-router.ts`

Solo bajo demanda:

- `02_proceso/workflows/local-extensions/loader.ts`

Diferir:

- `Extensiones no candidatas y locators privados`

## 4. Routing, workflow y skills

Rutas: `R8`  
Workflows: `L00`, `L01`, `L02`, `L03`, `L04`, `L05`  
Skills primarias: `frames-local-extension-foundry`

## 5. Tools, efectos y write policy

Tools: `local_extension_loader`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/workflows/local-extensions/contracts.ts`

Write set:

- `02_proceso/workflows/local-extensions/context.md`

Privacidad: `private_after_route_lock`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `LX_BRIEF_APPROVED`  
Stop rules: Capacidad canónica prevalece · Código sin sandbox no ejecuta

Hijos:

- Ninguno; devolver handoff al contexto padre.
