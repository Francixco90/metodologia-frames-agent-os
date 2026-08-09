<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-SKILL-SYSTEMS
-->

# Contexto: 02_proceso/workflows/skill-systems

## 1. Propósito y activación

R8 o R9 fijó alcance y debe diseñarse evaluarse o versionarse una skill.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:

- `02_proceso/workflows/skill-systems/contracts.ts`

## 3. Carga mínima y contexto diferido

Primero:

- `02_proceso/workflows/skill-systems/skill-suite.yml`

Solo bajo demanda:

- `02_proceso/workflows/skill-systems/governance.ts`

Diferir:

- `Pasos S no activos`
- `corpus`
- `adapters y releases`

## 4. Routing, workflow y skills

Rutas: `R8`, `R9`  
Workflows: `S00`, `S01`, `S02`, `S03`, `S04`, `S05`, `S06`, `S07`, `S08`, `S09`  
Skills primarias: `skill-system-architect`

## 5. Tools, efectos y write policy

Tools: `skills:inspect`, `skills:validate`, `skills:evaluate`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/workflows/skill-systems/contracts.ts`

Write set:

- `02_proceso/workflows/skill-systems/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `SSS_CASE_READY`, `SSS_ARCHITECTURE_READY`, `SSS_RELEASE_CANDIDATE`  
Stop rules: Trigger no autoriza · E3 sin sandbox no ejecuta · E4 fuera del MVP

Hijos:

- Ninguno; devolver handoff al contexto padre.
