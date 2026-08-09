<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-CAREER
-->
# Contexto: 02_proceso/workflows/career

## 1. Propósito y activación

R7 resolvió CV, carta, búsqueda, postulación o seguimiento laboral.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:
- `AGENTS.md`
- `02_proceso/workflows/career/index.ts`

## 3. Carga mínima y contexto diferido

Primero:
- `02_proceso/workflows/career/index.ts`

Solo bajo demanda:
- `02_proceso/workflows/career/_assets/deliverable-registry.yml`

Diferir:
- `Datos de otros candidatos y etapas no seleccionadas`

## 4. Routing, workflow y skills

Rutas: `R7`  
Workflows: `C00`, `C01`, `C02`, `C03`, `C04`, `C05`, `C06`, `C07`, `C08`, `C09`  
Skills primarias: `career-application-orchestrator`

## 5. Tools, efectos y write policy

Tools: `career_workflow_plan`  
Modo: `generated_only`. Read set mínimo:
- `02_proceso/workflows/career/index.ts`

Write set:
- `02_proceso/workflows/career/context.md`

Privacidad: `private_after_route_lock`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `career_brief_approved`  
Stop rules: Privacidad por candidato · C09 prepara y detiene sin autorización

Hijos:
- `CTX-C00`
- `CTX-C01`
- `CTX-C02`
- `CTX-C03`
- `CTX-C04`
- `CTX-C05`
- `CTX-C06`
- `CTX-C07`
- `CTX-C08`
- `CTX-C09`
