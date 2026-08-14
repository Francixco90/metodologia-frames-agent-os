<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-SKILL-CAREER-ORCHESTRATOR
-->

# Contexto: 03_artefactos/skills/career-application-orchestrator

## 1. Propósito y activación

Un pedido Career requiere brief, reanudación, paquete o preparación de postulación.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:

- `01_intencion/career/career-os-operating-contract-v2.md`
- `03_artefactos/skills/career-application-orchestrator/SKILL.md`

## 3. Carga mínima y contexto diferido

Primero:

- `01_intencion/career/career-os-operating-contract-v2.md`
- `03_artefactos/skills/career-application-orchestrator/SKILL.md`

Solo bajo demanda:

- `03_artefactos/skills/career-application-orchestrator/LINEAGE.yml`
- `03_artefactos/skills/career-evidence-interviewer/SKILL.md`
- `02_proceso/workflows/career/_schema/career-evidence-readiness-v1.schema.ts`
- `03_artefactos/skills/candidate-evidence-reconciler/schemas/candidate-evidence-handoff-v1.schema.json`
- `03_artefactos/skills/evidence-first-cv/schemas/cv-package-v3.schema.json`

Diferir:

- `PII no autorizada`
- `evidencia no seleccionada y C09 sin autorización`

## 4. Routing, workflow y skills

Rutas: `R7`, `R4`  
Workflows: `C00-C09`  
Skills primarias: `career-application-orchestrator`

## 5. Tools, efectos y write policy

Tools: `career_route`, `resume_lineage`  
Modo: `generated_only`. Read set mínimo:

- `01_intencion/career/career-os-operating-contract-v2.md`
- `03_artefactos/skills/career-application-orchestrator/SKILL.md`

Write set:

- `03_artefactos/skills/career-application-orchestrator/context.md`

Privacidad: `private_after_route_lock`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `CR_BRIEF_APPROVED`, `CR_CAREER_EVIDENCE_READY`, `CR_CV_DESIGN_APPROVED`, `CR_CV_SPEC_APPROVED`, `CR_CV_COMPILED`, `CR_PACKAGE_APPROVED`, `CR_SUBMISSION_AUTHORIZED`  
Stop rules: coverage_gap A1 bloquea dependencias materiales v1 · CR_CAREER_EVIDENCE_READY y CR_CV_COMPILED son technical STOP /usr/bin/false hasta A2/A5 y sus labels preservan los COVERAGE_GAP exactos · CR_PACKAGE_QA legacy no ejecutable produce coverage_gap A1_PACKAGE_QA_REFS_REQUIRED y stop · C06 exige spec aprobada y vigente · coverage_gap A1_C09_PACKAGE_APPROVAL_RECEIPT_REQUIRED mantiene el router en CR_PACKAGE_APPROVED y prepareSubmission es solo preview local no autorizado · PII y evidencia UNKNOWN bloquean

Hijos:

- Ninguno; devolver handoff al contexto padre.
