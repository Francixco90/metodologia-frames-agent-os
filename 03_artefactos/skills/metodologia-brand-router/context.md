<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-SKILL-BRAND-ROUTER
-->

# Contexto: 03_artefactos/skills/metodologia-brand-router

## 1. Propósito y activación

Un entregable debe resolver identidad voz canal tokens o drift de MetodologIA.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:

- `03_artefactos/skills/metodologia-brand-router/SKILL.md`

## 3. Carga mínima y contexto diferido

Primero:

- `03_artefactos/skills/metodologia-brand-router/SKILL.md`

Solo bajo demanda:

- `03_artefactos/skills/metodologia-brand-router/LINEAGE.yml`

Diferir:

- `Perfiles de otros canales y corpus visual no requerido`

## 4. Routing, workflow y skills

Rutas: `R6`  
Workflows: `P00`, `P05`, `P07`  
Skills primarias: `metodologia-brand-router`

## 5. Tools, efectos y write policy

Tools: `brand_profile`, `brand_check`  
Modo: `generated_only`. Read set mínimo:

- `03_artefactos/skills/metodologia-brand-router/SKILL.md`

Write set:

- `03_artefactos/skills/metodologia-brand-router/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `brand_source`, `brand_conformance`  
Stop rules: Fuente o licencia ausente bloquea · No descargar assets remotos

Hijos:

- Ninguno; devolver handoff al contexto padre.
