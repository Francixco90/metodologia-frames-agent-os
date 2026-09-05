<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-CONTENT-LIBRARY
-->

# Contexto: 02_proceso/workflows/content

## 1. Propósito y activación

Un workflow R6 necesita átomos de contenido o el Markdown canónico compilado.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:

- `02_proceso/workflows/content/types`

## 3. Carga mínima y contexto diferido

Primero:

- `02_proceso/workflows/content/build.ts`

Solo bajo demanda:

- `02_proceso/workflows/content/notebooklm-binding.yml`

Diferir:

- `Átomos y Markdown no seleccionados por el workflow activo`

## 4. Routing, workflow y skills

Rutas: `R6`  
Workflows: `ninguno`  
Skills primarias: `content-os-core`

## 5. Tools, efectos y write policy

Tools: `content:build`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/workflows/content/build.ts`

Write set:

- `02_proceso/workflows/content/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `MW_BRIEF_APPROVED`  
Stop rules: Librería sin ruta propia · Compila solo bajo un workflow R6 activo

Hijos:

- Ninguno; devolver handoff al contexto padre.
