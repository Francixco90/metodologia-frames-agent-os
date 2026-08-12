<!--
GENERATED from 02_proceso/governance/context-surfaces/registry.yml. Do not edit this projection.
context_id: CTX-SKILL-CAREER-EVIDENCE-INTERVIEWER
-->

# Contexto: 03_artefactos/skills/career-evidence-interviewer

## 1. Propósito y activación

Las fuentes Career no sostienen logros, competencias o atribución suficientes.

## 2. Autoridad y precedencia

Owner: `skill-foundry`. Cargar en este orden:

- `03_artefactos/skills/career-evidence-interviewer/SKILL.md`

## 3. Carga mínima y contexto diferido

Primero:

- `03_artefactos/skills/career-evidence-interviewer/SKILL.md`

Solo bajo demanda:

- `03_artefactos/skills/career-evidence-interviewer/LINEAGE.yml`
- `03_artefactos/skills/career-evidence-interviewer/receipts/runtime-boundary.yml`

Diferir:

- `Fuentes ya inventariadas`
- `respuestas no solicitadas y datos personales innecesarios`

## 4. Routing, workflow y skills

Rutas: `R7`  
Workflows: `C01`  
Skills primarias: `career-evidence-interviewer`

## 5. Tools, efectos y write policy

Tools: `career_evidence_interview`, `resume_lineage`  
Modo: `generated_only`. Read set mínimo:

- `03_artefactos/skills/career-evidence-interviewer/SKILL.md`

Write set:

- `03_artefactos/skills/career-evidence-interviewer/context.md`

Privacidad: `private_after_route_lock`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: `CR_CAREER_EVIDENCE_READY`  
Stop rules: Máximo tres preguntas por ronda y cuatro rondas · Inferencias solo entrevista hasta confirmación

Hijos:

- Ninguno; devolver handoff al contexto padre.
