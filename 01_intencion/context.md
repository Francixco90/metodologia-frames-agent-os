<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-INTENT
-->
# Contexto: 01_intencion

## 1. Propósito y activación

Consultar intención, ADR, programa, DAG u ownership canónicos.

## 2. Autoridad y precedencia

Owner: `lead`. Cargar en este orden:
- `AGENTS.md`
- `01_intencion/program/dag.yml`
- `01_intencion/program/ownership-manifest.yml`

## 3. Carga mínima y contexto diferido

Primero:
- `AGENTS.md`
- `01_intencion/program/dag.yml`

Solo bajo demanda:
- `01_intencion/program/ownership-manifest.yml`

Diferir:
- `Fuentes importadas y propuestas no adoptadas`

## 4. Routing, workflow y skills

Rutas: `ninguna`  
Workflows: `ninguno`  
Skills primarias: `ninguna`

## 5. Tools, efectos y write policy

Tools: `read_only`  
Modo: `generated_only`. Read set mínimo:
- `01_intencion/program/dag.yml`
- `01_intencion/program/ownership-manifest.yml`

Write set:
- `01_intencion/context.md`

Privacidad: `public_only`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `authority`, `ownership`  
Stop rules: Contradicción aplica precedencia más restrictiva

Hijos:
- Ninguno; devolver handoff al contexto padre.
