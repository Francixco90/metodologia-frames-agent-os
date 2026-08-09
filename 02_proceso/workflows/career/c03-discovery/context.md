<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-C03
-->
# Contexto: 02_proceso/workflows/career/c03-discovery

## 1. Propósito y activación

Buscar oportunidades en fuentes públicas y autorizadas.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:
- `02_proceso/workflows/career/c03-discovery/workflow.yml`

## 3. Carga mínima y contexto diferido

Primero:
- `02_proceso/workflows/career/c03-discovery/workflow.yml`

Solo bajo demanda:
- `02_proceso/governance/tool-policy.yml`

Diferir:
- `Credenciales cookies y scraping no autorizado`

## 4. Routing, workflow y skills

Rutas: `R7`  
Workflows: `C03`  
Skills primarias: `career-opportunity-finder`

## 5. Tools, efectos y write policy

Tools: `read_only_discovery`  
Modo: `generated_only`. Read set mínimo:
- `02_proceso/workflows/career/c03-discovery/workflow.yml`

Write set:
- `02_proceso/workflows/career/c03-discovery/context.md`

Privacidad: `private_after_route_lock`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `source_authority`  
Stop rules: LinkedIn es adapter no autoridad del núcleo

Hijos:
- Ninguno; devolver handoff al contexto padre.
