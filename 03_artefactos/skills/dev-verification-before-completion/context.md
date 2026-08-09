<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-SKILL-VERIFICATION
-->
# Contexto: 03_artefactos/skills/dev-verification-before-completion

## 1. Propósito y activación

Un candidate congelado requiere evidencia actual antes de afirmar cierre.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:
- `03_artefactos/skills/dev-verification-before-completion/SKILL.md`

## 3. Carga mínima y contexto diferido

Primero:
- `03_artefactos/skills/dev-verification-before-completion/SKILL.md`

Solo bajo demanda:
- `03_artefactos/skills/dev-verification-before-completion/LINEAGE.yml`

Diferir:
- `Suites no afectadas y evidencia de candidates anteriores`

## 4. Routing, workflow y skills

Rutas: `R4`, `R6`, `R7`  
Workflows: `P07`, `P08`, `C08`  
Skills primarias: `dev-verification-before-completion`

## 5. Tools, efectos y write policy

Tools: `focused_checks`, `candidate_verify`  
Modo: `generated_only`. Read set mínimo:
- `03_artefactos/skills/dev-verification-before-completion/SKILL.md`

Write set:
- `03_artefactos/skills/dev-verification-before-completion/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `candidate_freeze`, `verification`  
Stop rules: Manual no simula runtime · Sin evidencia material no declarar PASS

Hijos:
- Ninguno; devolver handoff al contexto padre.
