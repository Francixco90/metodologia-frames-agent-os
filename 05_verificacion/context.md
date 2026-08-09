<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-VERIFY
-->
# Contexto: 05_verificacion

## 1. Propósito y activación

Verificar contratos, pruebas, calidad, gates o evidencia de cierre.

## 2. Autoridad y precedencia

Owner: `qa`. Cargar en este orden:
- `AGENTS.md`
- `05_verificacion/scripts/commands.yaml`

## 3. Carga mínima y contexto diferido

Primero:
- `AGENTS.md`
- `05_verificacion/scripts/commands.yaml`

Solo bajo demanda:
- `01_intencion/program/test-strategy.md`

Diferir:
- `Suites no afectadas y evidencia histórica`

## 4. Routing, workflow y skills

Rutas: `ninguna`  
Workflows: `P07`, `P08`, `C08`  
Skills primarias: `dev-verification-before-completion`

## 5. Tools, efectos y write policy

Tools: `focused_checks`, `verify`  
Modo: `generated_only`. Read set mínimo:
- `05_verificacion/scripts/commands.yaml`

Write set:
- `05_verificacion/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `tests`, `evidence`  
Stop rules: No declarar PASS sin evidencia material

Hijos:
- `CTX-VERIFY-SCRIPTS`
