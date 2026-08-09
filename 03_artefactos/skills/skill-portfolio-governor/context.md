<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-SKILL-PORTFOLIO-GOVERNOR
-->

# Contexto: 03_artefactos/skills/skill-portfolio-governor

## 1. Propósito y activación

S01 o S07 debe resolver overlap owner deuda o retiro.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:

- `03_artefactos/skills/skill-portfolio-governor/SKILL.md`

## 3. Carga mínima y contexto diferido

Primero:

- `03_artefactos/skills/skill-portfolio-governor/SKILL.md`

Solo bajo demanda:

- `04_estado/registries/skills/skill-system-migration.yml`

Diferir:

- `Contenido privado de extensiones`

## 4. Routing, workflow y skills

Rutas: `R8`, `R9`  
Workflows: `S01`, `S07`  
Skills primarias: `skill-portfolio-governor`

## 5. Tools, efectos y write policy

Tools: `skills:inspect`  
Modo: `generated_only`. Read set mínimo:

- `04_estado/registries/skills/skill-system-migration.yml`

Write set:

- `03_artefactos/skills/skill-portfolio-governor/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `SSS_REVIEW_VALIDATED`  
Stop rules: Propuesta no equivale a mutación

Hijos:

- Ninguno; devolver handoff al contexto padre.
