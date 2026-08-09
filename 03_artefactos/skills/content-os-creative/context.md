<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-SKILL-CONTENT-CREATIVE
-->

# Contexto: 03_artefactos/skills/content-os-creative

## 1. Propósito y activación

Una pieza necesita dirección creativa narrativa assets o criterios wow adecuados.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:

- `03_artefactos/skills/content-os-creative/SKILL.md`

## 3. Carga mínima y contexto diferido

Primero:

- `03_artefactos/skills/content-os-creative/SKILL.md`

Solo bajo demanda:

- `03_artefactos/skills/content-os-creative/LINEAGE.yml`

Diferir:

- `Motion`
- `canales y assets no requeridos`

## 4. Routing, workflow y skills

Rutas: `R6`  
Workflows: `P03`, `P05`, `P06`, `P07`  
Skills primarias: `content-os-creative`

## 5. Tools, efectos y write policy

Tools: `creative_spec`, `evidence_map`  
Modo: `generated_only`. Read set mínimo:

- `03_artefactos/skills/content-os-creative/SKILL.md`

Write set:

- `03_artefactos/skills/content-os-creative/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `MW_BRIEF_APPROVED`, `MW_SPEC_APPROVED`  
Stop rules: Wow no sustituye evidencia · Marca y derechos desconocidos bloquean

Hijos:

- Ninguno; devolver handoff al contexto padre.
