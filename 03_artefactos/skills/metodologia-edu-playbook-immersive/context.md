<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-AULA-METODOLOGIA-EDU-PLAYBOOK-IMMERSIVE
-->

# Contexto: 03_artefactos/skills/metodologia-edu-playbook-immersive

## 1. Propósito y activación

R6 recomienda playbook-immersive en edición metodologia.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:

- `03_artefactos/skills/metodologia-edu-playbook-immersive/SKILL.md`

## 3. Carga mínima y contexto diferido

Primero:

- `03_artefactos/skills/metodologia-edu-playbook-immersive/SKILL.md`

Solo bajo demanda:

- `03_artefactos/skills/metodologia-edu-playbook-immersive/references/runtime.md`

Diferir:

- `Otras skills y fuentes privadas`

## 4. Routing, workflow y skills

Rutas: `R6`  
Workflows: `P05`, `P06`, `P07`  
Skills primarias: `metodologia-edu-playbook-immersive`

## 5. Tools, efectos y write policy

Tools: `frames:aula`  
Modo: `generated_only`. Read set mínimo:

- `03_artefactos/skills/metodologia-edu-playbook-immersive/examples/input.json`

Write set:

- `03_artefactos/skills/metodologia-edu-playbook-immersive/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `EXP_BRIEF_APPROVED`  
Stop rules: RENDERED_DRAFT; ninguna publicación de piezas

Hijos:

- Ninguno; devolver handoff al contexto padre.
