<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-C01
-->

# Contexto: 02_proceso/workflows/career/c01-evidence

## 1. Propósito y activación

Normalizar claims, contradicciones, confianza y gaps del candidato.

## 2. Autoridad y precedencia

Owner: `content`. Cargar en este orden:

- `02_proceso/workflows/career/c01-evidence/workflow.yml`

## 3. Carga mínima y contexto diferido

Primero:

- `02_proceso/workflows/career/c01-evidence/workflow.yml`

Solo bajo demanda:

- `02_proceso/workflows/career/_schema`

Diferir:

- `Evidencia no seleccionada`

## 4. Routing, workflow y skills

Rutas: `R7`  
Workflows: `C01`  
Skills primarias: `candidate-evidence-reconciler`, `career-evidence-interviewer`

## 5. Tools, efectos y write policy

Tools: `evidence_reconcile`, `career_evidence_interview`, `resume_lineage`  
Modo: `generated_only`. Read set mínimo:

- `02_proceso/workflows/career/c01-evidence/workflow.yml`

Write set:

- `02_proceso/workflows/career/c01-evidence/context.md`

Privacidad: `private_after_route_lock`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `evidence_confidence`, `CR_CAREER_EVIDENCE_READY`  
Stop rules: inferred y missing no se convierten en hechos · C02 exige readiness material vigente

Hijos:

- Ninguno; devolver handoff al contexto padre.
