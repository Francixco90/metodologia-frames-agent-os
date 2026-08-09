<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-C07
-->
# Contexto: 02_proceso/workflows/career/c07-cover-letter

## 1. Propósito y activación

Crear carta, respuesta de formulario o mensaje que complemente el CV.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:
- `02_proceso/workflows/career/c07-cover-letter/workflow.yml`

## 3. Carga mínima y contexto diferido

Primero:
- `02_proceso/workflows/career/c07-cover-letter/workflow.yml`

Solo bajo demanda:
- `02_proceso/workflows/career/_assets/deliverable-registry.yml`

Diferir:
- `Repetición del CV y claims no demostrados`

## 4. Routing, workflow y skills

Rutas: `R7`  
Workflows: `C07`  
Skills primarias: `evidence-based-cover-letter`

## 5. Tools, efectos y write policy

Tools: `letter_render`  
Modo: `generated_only`. Read set mínimo:
- `02_proceso/workflows/career/c07-cover-letter/workflow.yml`

Write set:
- `02_proceso/workflows/career/c07-cover-letter/context.md`

Privacidad: `private_after_route_lock`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `channel_fit`, `evidence`  
Stop rules: Respetar longitud del canal y omission record

Hijos:
- Ninguno; devolver handoff al contexto padre.
