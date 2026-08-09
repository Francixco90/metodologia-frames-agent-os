<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-C00
-->
# Contexto: 02_proceso/workflows/career/c00-intake

## 1. Propósito y activación

Iniciar candidato, privacidad, alcance y brief de fundación.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:
- `02_proceso/workflows/career/c00-intake/workflow.yml`

## 3. Carga mínima y contexto diferido

Primero:
- `02_proceso/workflows/career/c00-intake/workflow.yml`

Solo bajo demanda:
- `02_proceso/workflows/career/_schema`

Diferir:
- `PII no necesaria y vacantes no seleccionadas`

## 4. Routing, workflow y skills

Rutas: `R7`  
Workflows: `C00`  
Skills primarias: `career-application-orchestrator`

## 5. Tools, efectos y write policy

Tools: `career_intake`  
Modo: `generated_only`. Read set mínimo:
- `02_proceso/workflows/career/c00-intake/workflow.yml`

Write set:
- `02_proceso/workflows/career/c00-intake/context.md`

Privacidad: `private_after_route_lock`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `privacy_classification`  
Stop rules: Máximo tres preguntas bloqueantes

Hijos:
- Ninguno; devolver handoff al contexto padre.
