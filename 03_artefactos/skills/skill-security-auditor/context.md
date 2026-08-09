<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-SKILL-SECURITY-AUDITOR
-->

# Contexto: 03_artefactos/skills/skill-security-auditor

## 1. Propósito y activación

S05 o S07 requiere auditoría adversarial de seguridad supply chain o expansión de autoridad.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:

- `03_artefactos/skills/skill-security-auditor/SKILL.md`

## 3. Carga mínima y contexto diferido

Primero:

- `03_artefactos/skills/skill-security-auditor/SKILL.md`

Solo bajo demanda:

- `03_artefactos/skills/skill-security-auditor/references/operating-contract.md`
- `02_proceso/workflows/skill-systems/dossier-adoption.yml`

Diferir:

- `Bundle PIVOTE completo y fuentes no seleccionadas`

## 4. Routing, workflow y skills

Rutas: `R8`, `R9`  
Workflows: `S05`, `S07`  
Skills primarias: `skill-security-auditor`

## 5. Tools, efectos y write policy

Tools: `skills:validate`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/workflows/skill-systems/adoption-contracts.ts`
- `00_inbox/first-party/SRC-MULTIMEDIA-PIVOTE-20PLUS1-V4.projection.yml`

Write set:

- `03_artefactos/skills/skill-security-auditor/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `SSS_STATIC_VALIDATED`, `SSS_REVIEW_VALIDATED`  
Stop rules: UNKNOWN o conflicto no resuelto bloquea

Hijos:

- Ninguno; devolver handoff al contexto padre.
