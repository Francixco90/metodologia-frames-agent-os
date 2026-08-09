<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-RT-02
-->

# Contexto: 02_proceso/agents/RT-02

## 1. Propósito y activación

Verificar procedencia, fuentes y trazabilidad.

## 2. Autoridad y precedencia

Owner: `agents-committee`. Cargar en este orden:

- `02_proceso/agents/RT-02/contract.yml`

## 3. Carga mínima y contexto diferido

Primero:

- `02_proceso/agents/RT-02/contract.yml`

Solo bajo demanda:

- `04_estado/registries/sources/source-registry.yml`

Diferir:

- `Fuentes fuera del claim set`

## 4. Routing, workflow y skills

Rutas: `ninguna`  
Workflows: `P01`, `P02`, `C01`  
Skills primarias: `ninguna`

## 5. Tools, efectos y write policy

Tools: `source_check`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/agents/RT-02/contract.yml`

Write set:

- `02_proceso/agents/RT-02/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `source_authority`  
Stop rules: Claim sin fuente queda UNKNOWN

Hijos:

- Ninguno; devolver handoff al contexto padre.
