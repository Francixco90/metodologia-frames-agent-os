<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-SKILL-CAREER-ORCHESTRATOR
-->

# Contexto: 03_artefactos/skills/career-application-orchestrator

## 1. Propósito y activación

Un pedido Career requiere brief, reanudación, paquete o preparación de postulación.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:

- `03_artefactos/skills/career-application-orchestrator/SKILL.md`

## 3. Carga mínima y contexto diferido

Primero:

- `03_artefactos/skills/career-application-orchestrator/SKILL.md`

Solo bajo demanda:

- `03_artefactos/skills/career-application-orchestrator/LINEAGE.yml`
- `03_artefactos/skills/candidate-evidence-reconciler/schemas/candidate-evidence-handoff-v1.schema.json`
- `03_artefactos/skills/evidence-first-cv/schemas/cv-package-v2.schema.json`

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

- `03_artefactos/skills/career-application-orchestrator/SKILL.md`

Write set:

- `03_artefactos/skills/career-application-orchestrator/context.md`

Privacidad: `private_after_route_lock`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `CR_BRIEF_APPROVED`, `CR_CV_SPEC_APPROVED`, `CR_PACKAGE_QA`, `CR_SUBMISSION_AUTHORIZED`  
Stop rules: C06 exige spec aprobada y vigente · C09 prepara y detiene · PII y evidencia UNKNOWN bloquean

Hijos:

- Ninguno; devolver handoff al contexto padre.
