<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-RT-06
-->
# Contexto: 02_proceso/agents/RT-06

## 1. Propósito y activación

Diseñar experiencia, adapters, documentación y accesibilidad.

## 2. Autoridad y precedencia

Owner: `agents-committee`. Cargar en este orden:
- `02_proceso/agents/RT-06/contract.yml`

## 3. Carga mínima y contexto diferido

Primero:
- `02_proceso/agents/RT-06/contract.yml`

Solo bajo demanda:
- `02_proceso/governance/experience-first-orchestration.md`

Diferir:
- `Hosts no seleccionados`

## 4. Routing, workflow y skills

Rutas: `R0`, `R6`, `R7`  
Workflows: `ninguno`  
Skills primarias: `ninguna`

## 5. Tools, efectos y write policy

Tools: `experience_review`  
Modo: `generated_only`. Read set mínimo:
- `02_proceso/agents/RT-06/contract.yml`

Write set:
- `02_proceso/agents/RT-06/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `accessibility`, `host_capability`  
Stop rules: Configuración no prueba ejecución

Hijos:
- Ninguno; devolver handoff al contexto padre.
