<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-ROOT
-->
# Contexto: .

## 1. Propósito y activación

Entrada universal; orientar antes de cargar una familia de trabajo.

## 2. Autoridad y precedencia

Owner: `lead`. Cargar en este orden:
- `AGENTS.md`
- `02_proceso/governance/router.yml`

## 3. Carga mínima y contexto diferido

Primero:
- `AGENTS.md`
- `02_proceso/governance/router.yml`

Solo bajo demanda:
- `README.md`
- `02_proceso/governance/experience-first-orchestration.md`

Diferir:
- `Estado privado`
- `corpus`
- `receipts y familias no seleccionadas`

## 4. Routing, workflow y skills

Rutas: `R0`, `R1`, `R2`, `R3`, `R3-LOOSE`, `R4`, `R5`, `R6`, `R7`  
Workflows: `ninguno`  
Skills primarias: `content-os-router`

## 5. Tools, efectos y write policy

Tools: `frames:assist`  
Modo: `generated_only`. Read set mínimo:
- `AGENTS.md`
- `02_proceso/governance/router.yml`

Write set:
- `context.md`

Privacidad: `private_after_route_lock`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `route_lock`  
Stop rules: Ambigüedad material bloquea · Saludos y comandos de inspección no escriben

Hijos:
- `CTX-INBOX`
- `CTX-INTENT`
- `CTX-PROCESS`
- `CTX-ARTIFACTS`
- `CTX-STATE`
- `CTX-VERIFY`
