<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-P03
-->
# Contexto: 02_proceso/workflows/multimedia/p03-crear-brief

## 1. Propósito y activación

Toda pieza nueva requiere interpretar y congelar un brief canónico.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:
- `02_proceso/workflows/multimedia/p03-crear-brief/workflow.yml`

## 3. Carga mínima y contexto diferido

Primero:
- `02_proceso/workflows/multimedia/p03-crear-brief/workflow.yml`

Solo bajo demanda:
- `02_proceso/workflows/multimedia/_assets/brief-document-template.md`

Diferir:
- `Producción y distribución`

## 4. Routing, workflow y skills

Rutas: `R6`  
Workflows: `P03`  
Skills primarias: `content-os-creative`

## 5. Tools, efectos y write policy

Tools: `brief_renderer`  
Modo: `generated_only`. Read set mínimo:
- `02_proceso/workflows/multimedia/p03-crear-brief/workflow.yml`

Write set:
- `02_proceso/workflows/multimedia/p03-crear-brief/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `MW_BRIEF_APPROVED`  
Stop rules: Máximo tres preguntas bloqueantes · Brief no aprobado no produce

Hijos:
- Ninguno; devolver handoff al contexto padre.
