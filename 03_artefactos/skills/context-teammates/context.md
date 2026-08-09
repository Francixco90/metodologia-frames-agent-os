<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-SKILL-CONTEXT-TEAMMATES
-->

# Contexto: 03_artefactos/skills/context-teammates

## 1. Propósito y activación

Especialistas independientes requieren WorkOrders y handoffs acotados.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:

- `03_artefactos/skills/context-teammates/SKILL.md`

## 3. Carga mínima y contexto diferido

Primero:

- `03_artefactos/skills/context-teammates/SKILL.md`

Solo bajo demanda:

- `03_artefactos/skills/context-teammates/LINEAGE.yml`

Diferir:

- `Contexto de otros agentes y trabajo duplicado`

## 4. Routing, workflow y skills

Rutas: `R4`, `R6`, `R7`  
Workflows: `ninguno`  
Skills primarias: `context-teammates`

## 5. Tools, efectos y write policy

Tools: `work_order`, `implementation_handoff`  
Modo: `generated_only`. Read set mínimo:

- `03_artefactos/skills/context-teammates/SKILL.md`

Write set:

- `03_artefactos/skills/context-teammates/context.md`

Privacidad: `private_after_route_lock`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `ownership`, `handoff`  
Stop rules: Un writer por ruta · Producer y verifier separados cuando aplica

Hijos:

- Ninguno; devolver handoff al contexto padre.
