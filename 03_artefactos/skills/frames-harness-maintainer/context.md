<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-SKILL-HARNESS-MAINTAINER
-->

# Contexto: 03_artefactos/skills/frames-harness-maintainer

## 1. Propósito y activación

R9 exige mantenimiento correctivo o evolutivo gobernado.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:

- `03_artefactos/skills/frames-harness-maintainer/SKILL.md`

## 3. Carga mínima y contexto diferido

Primero:

- `03_artefactos/skills/frames-harness-maintainer/SKILL.md`

Solo bajo demanda:

- `03_artefactos/skills/frames-harness-maintainer/references/operating-contract.md`

Diferir:

- `Código fuera del write set`

## 4. Routing, workflow y skills

Rutas: `R9`  
Workflows: `M00`, `M01`, `M02`, `M03`, `M04`, `M05`, `M06`  
Skills primarias: `frames-harness-maintainer`

## 5. Tools, efectos y write policy

Tools: `maintenance_plan`  
Modo: `generated_only`. Read set mínimo:

- `03_artefactos/skills/frames-harness-maintainer/SKILL.md`

Write set:

- `03_artefactos/skills/frames-harness-maintainer/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `HM_CHANGE_APPROVED`, `HM_PROMOTION_APPROVED`  
Stop rules: No mutar antes de aprobación · No promover por inferencia

Hijos:

- Ninguno; devolver handoff al contexto padre.
