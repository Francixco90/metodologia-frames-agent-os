<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-SKILL-WRITING-PLANS
-->
# Contexto: 03_artefactos/skills/dev-writing-plans

## 1. Propósito y activación

Un cambio complejo necesita plan ejecutable con base write sets budgets y aceptación.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:
- `03_artefactos/skills/dev-writing-plans/SKILL.md`

## 3. Carga mínima y contexto diferido

Primero:
- `03_artefactos/skills/dev-writing-plans/SKILL.md`

Solo bajo demanda:
- `03_artefactos/skills/dev-writing-plans/LINEAGE.yml`

Diferir:
- `Corpus no tocado y soluciones fuera de alcance`

## 4. Routing, workflow y skills

Rutas: `R2`, `R3`, `R4`, `R6`, `R7`  
Workflows: `ninguno`  
Skills primarias: `dev-writing-plans`

## 5. Tools, efectos y write policy

Tools: `plan`, `budget_envelope`  
Modo: `generated_only`. Read set mínimo:
- `03_artefactos/skills/dev-writing-plans/SKILL.md`

Write set:
- `03_artefactos/skills/dev-writing-plans/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `plan_acceptance`, `ownership`  
Stop rules: Ambigüedad material se resuelve · Hard max obliga a dividir

Hijos:
- Ninguno; devolver handoff al contexto padre.
