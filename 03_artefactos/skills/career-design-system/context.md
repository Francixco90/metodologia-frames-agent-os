<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-SKILL-CAREER-DESIGN-SYSTEM
-->

# Contexto: 03_artefactos/skills/career-design-system

## 1. Propósito y activación

Un CV ejecutivo requiere brief visual, dos alternativas, selección humana o verificación de drift.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:

- `03_artefactos/skills/career-design-system/SKILL.md`
- `03_artefactos/brand/career-design-system/manifest.v1.json`

## 3. Carga mínima y contexto diferido

Primero:

- `03_artefactos/skills/career-design-system/SKILL.md`

Solo bajo demanda:

- `03_artefactos/skills/career-design-system/references/options-contract.md`
- `03_artefactos/skills/career-design-system/references/verification.md`

Diferir:

- `CV privado`
- `bindings de contacto`
- `outputs no solicitados`

## 4. Routing, workflow y skills

Rutas: `R7`, `R4`  
Workflows: `C06`, `C08`  
Skills primarias: `career-design-system`

## 5. Tools, efectos y write policy

Tools: `career_design_brief`, `career_design_verify`  
Modo: `generated_only`. Read set mínimo:

- `03_artefactos/skills/career-design-system/SKILL.md`
- `03_artefactos/brand/career-design-system/manifest.v1.json`

Write set:

- `03_artefactos/skills/career-design-system/context.md`

Privacidad: `private_after_route_lock`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `CR_CV_DESIGN_APPROVED`, `G09_CAREER_DESIGN`  
Stop rules: Exactamente dos alternativas · Selección stale bloquea HTML ejecutivo

Hijos:

- Ninguno; devolver handoff al contexto padre.
