<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-DOCUMENTATION
-->

# Contexto: 02_proceso/workflows/documentation

## 1. Propósito y activación

Se debe explicar, proyectar o verificar una capacidad de Frames.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:

- `02_proceso/workflows/documentation/README.md`
- `02_proceso/core/contracts/documentation-governance-v1.ts`

## 3. Carga mínima y contexto diferido

Primero:

- `02_proceso/workflows/documentation/README.md`

Solo bajo demanda:

- `02_proceso/workflows/documentation/contracts.ts`

Diferir:

- `Páginas de workflows no afectados`

## 4. Routing, workflow y skills

Rutas: `R9`  
Workflows: `M05`  
Skills primarias: `frames-docs-as-code`

## 5. Tools, efectos y write policy

Tools: `documentation_generator`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/workflows/documentation/README.md`

Write set:

- `02_proceso/workflows/documentation/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `DOCS_TRANSVERSAL_COMPLETE`  
Stop rules: Derivados no se editan · Drift o referencia rota bloquea

Hijos:

- Ninguno; devolver handoff al contexto padre.
