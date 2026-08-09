<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-VERIFY-SCRIPTS
-->
# Contexto: 05_verificacion/scripts

## 1. Propósito y activación

Ejecutar checkers y generators registrados con argv explícito y modo check por defecto.

## 2. Autoridad y precedencia

Owner: `repo`. Cargar en este orden:
- `AGENTS.md`
- `05_verificacion/scripts/commands.yaml`

## 3. Carga mínima y contexto diferido

Primero:
- `05_verificacion/scripts/commands.yaml`

Solo bajo demanda:
- `01_intencion/program/test-strategy.md`

Diferir:
- `Generators y suites no afectados`

## 4. Routing, workflow y skills

Rutas: `ninguna`  
Workflows: `ninguno`  
Skills primarias: `dev-verification-before-completion`

## 5. Tools, efectos y write policy

Tools: `check`, `generate`  
Modo: `generated_only`. Read set mínimo:
- `05_verificacion/scripts/commands.yaml`

Write set:
- `05_verificacion/scripts/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `argv_safety`, `deterministic_check`  
Stop rules: Check no escribe · Generator exige write explícito

Hijos:
- Ninguno; devolver handoff al contexto padre.
