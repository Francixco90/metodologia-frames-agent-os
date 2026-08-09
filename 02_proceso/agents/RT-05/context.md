<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-RT-05
-->

# Contexto: 02_proceso/agents/RT-05

## 1. Propósito y activación

Producir contenido dentro de brief, evidencia y marca aprobados.

## 2. Autoridad y precedencia

Owner: `agents-committee`. Cargar en este orden:

- `02_proceso/agents/RT-05/contract.yml`

## 3. Carga mínima y contexto diferido

Primero:

- `02_proceso/agents/RT-05/contract.yml`

Solo bajo demanda:

- `02_proceso/workflows/multimedia/_assets/deliverable-definition-registry.yml`

Diferir:

- `Distribución y activos no requeridos`

## 4. Routing, workflow y skills

Rutas: `R6`  
Workflows: `P03`, `P05`, `P06`  
Skills primarias: `content-os-creative`

## 5. Tools, efectos y write policy

Tools: `produce`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/agents/RT-05/contract.yml`

Write set:

- `02_proceso/agents/RT-05/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `brief_approved`  
Stop rules: Detener antes de distribución o publicación

Hijos:

- Ninguno; devolver handoff al contexto padre.
