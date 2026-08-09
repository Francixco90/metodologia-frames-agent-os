<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-SKILL-CONTENT-CORE
-->

# Contexto: 03_artefactos/skills/content-os-core

## 1. Propósito y activación

Un paso Content necesita contratos composición determinista o límites de escritura.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:

- `03_artefactos/skills/content-os-core/SKILL.md`

## 3. Carga mínima y contexto diferido

Primero:

- `03_artefactos/skills/content-os-core/SKILL.md`

Solo bajo demanda:

- `03_artefactos/skills/content-os-core/LINEAGE.yml`

Diferir:

- `Renderers y canales no elegidos`

## 4. Routing, workflow y skills

Rutas: `R6`  
Workflows: `P03`, `P05`, `P06`, `P08`  
Skills primarias: `content-os-core`

## 5. Tools, efectos y write policy

Tools: `work_order`, `deterministic_compose`  
Modo: `generated_only`. Read set mínimo:

- `03_artefactos/skills/content-os-core/SKILL.md`

Write set:

- `03_artefactos/skills/content-os-core/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `execution_authz`, `material_receipt`  
Stop rules: Output no material bloquea · Escribir solo dentro del write set

Hijos:

- Ninguno; devolver handoff al contexto padre.
