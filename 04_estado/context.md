<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-STATE
-->
# Contexto: 04_estado

## 1. Propósito y activación

Leer o persistir estado, registries, receipts, releases o tareas autorizadas.

## 2. Autoridad y precedencia

Owner: `governance`. Cargar en este orden:
- `AGENTS.md`
- `01_intencion/program/dag.yml`

## 3. Carga mínima y contexto diferido

Primero:
- `AGENTS.md`
- `01_intencion/program/dag.yml`

Solo bajo demanda:
- `01_intencion/program/dag.yml`

Diferir:
- `Receipts y tareas fuera del lineage activo`

## 4. Routing, workflow y skills

Rutas: `R2`, `R4`  
Workflows: `ninguno`  
Skills primarias: `ninguna`

## 5. Tools, efectos y write policy

Tools: `read_back_hash`  
Modo: `generated_only`. Read set mínimo:
- `01_intencion/program/dag.yml`

Write set:
- `04_estado/context.md`

Privacidad: `private_after_route_lock`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `state_transition`, `lineage`  
Stop rules: UNKNOWN no promueve · Candidate congelado crea successor

Hijos:
- `CTX-REGISTRIES`
