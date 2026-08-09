<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-SKILL-CONTRACT-VALIDATOR
-->

# Contexto: 03_artefactos/skills/skill-contract-validator

## 1. Propósito y activación

S03 o S05 debe validar contratos paquete paths o supply chain.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:

- `03_artefactos/skills/skill-contract-validator/SKILL.md`

## 3. Carga mínima y contexto diferido

Primero:

- `03_artefactos/skills/skill-contract-validator/SKILL.md`

Solo bajo demanda:

- `03_artefactos/skills/skill-contract-validator/references/operating-contract.md`

Diferir:

- `Corpus de outcome`

## 4. Routing, workflow y skills

Rutas: `R8`, `R9`  
Workflows: `S03`, `S05`  
Skills primarias: `skill-contract-validator`

## 5. Tools, efectos y write policy

Tools: `skills:validate`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/workflows/skill-systems/contracts.ts`

Write set:

- `03_artefactos/skills/skill-contract-validator/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `SSS_STATIC_VALIDATED`  
Stop rules: Referencia stale escape o permiso extra bloquea

Hijos:

- Ninguno; devolver handoff al contexto padre.
