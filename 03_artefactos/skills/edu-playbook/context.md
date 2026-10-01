<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-AULA-EDU-PLAYBOOK
-->

# Contexto: 03_artefactos/skills/edu-playbook

## 1. Propósito y activación

R6 recomienda playbook en edición white-label.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:

- `03_artefactos/skills/edu-playbook/SKILL.md`

## 3. Carga mínima y contexto diferido

Primero:

- `03_artefactos/skills/edu-playbook/SKILL.md`

Solo bajo demanda:

- `03_artefactos/skills/edu-playbook/references/runtime.md`

Diferir:

- `Otras skills y fuentes privadas`

## 4. Routing, workflow y skills

Rutas: `R6`  
Workflows: `P05`, `P06`, `P07`  
Skills primarias: `edu-playbook`

## 5. Tools, efectos y write policy

Tools: `frames:aula`  
Modo: `generated_only`. Read set mínimo:

- `03_artefactos/skills/edu-playbook/examples/input.json`

Write set:

- `03_artefactos/skills/edu-playbook/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `EXP_BRIEF_APPROVED`  
Stop rules: RENDERED_DRAFT; ninguna publicación de piezas

Hijos:

- Ninguno; devolver handoff al contexto padre.
