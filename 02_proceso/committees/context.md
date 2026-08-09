<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-COMMITTEES
-->
# Contexto: 02_proceso/committees

## 1. Propósito y activación

Un gate exige comité, aprobación humana o separación formal.

## 2. Autoridad y precedencia

Owner: `agents-committee`. Cargar en este orden:
- `AGENTS.md`
- `02_proceso/committees/creation/H-01`

## 3. Carga mínima y contexto diferido

Primero:
- `AGENTS.md`
- `02_proceso/committees/creation/H-01`

Solo bajo demanda:
- `01_intencion/program/dag.yml`

Diferir:
- `Comités no convocados y evidencia histórica`

## 4. Routing, workflow y skills

Rutas: `ninguna`  
Workflows: `ninguno`  
Skills primarias: `ninguna`

## 5. Tools, efectos y write policy

Tools: `committee_review`  
Modo: `generated_only`. Read set mínimo:
- `02_proceso/committees/creation/H-01`

Write set:
- `02_proceso/committees/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `H01`, `H03`  
Stop rules: Aprobación simulada no promueve

Hijos:
- Ninguno; devolver handoff al contexto padre.
