---
name: career-application-orchestrator
description: This skill should be used when the user asks to "crear mi CV", "adaptar mi hoja de vida", "escribir una cover letter", "buscar vacantes", "ayudarme a postular", or continue a governed candidate application.
version: 0.4.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Career Application Orchestrator

## Contexto operativo

Lee [`context.md`](context.md) antes de cargar referencias. Define el contexto mínimo, la ruta, los efectos permitidos, los gates y el handoff de esta skill.

Puerta profesional de Frames. Compila un pedido en `CareerIntentV1`, crea siempre
un brief canónico y selecciona solo las etapas C00–C09 necesarias. Coordina las
skills especialistas; no inventa evidencia, busca en vivo ni envía postulaciones.
[METODOLOGIA][CONFIG]

## Contrato de entrada

1. Clasifica la intención: `general_cv`, `targeted_cv`, `cover_letter`,
   `job_search`, `full_application`, `follow_up` o `intervention`.
2. Resuelve `candidate_id`, objetivo, idioma, vacante, canal, restricciones y
   efectos. Los datos personales viven fuera de Git.
3. Formula como máximo tres preguntas materialmente bloqueantes. No repitas
   datos ya resueltos.
4. Emite `candidate-foundation-brief`, `job-search-brief`, `application-brief` o
   `application-intervention-brief`; Markdown es canónico y HTML es derivado.
5. Registra `brief_ref`, `selected_stage_path`, skills y siguiente gate.
6. Antes de posicionar o compilar, resuelve `career-evidence-readiness-v1`.
   Si falta evidencia material, activa `career-evidence-interviewer`; si las
   fuentes ya bastan, no pregunta de nuevo.
7. Antes de C06, exige Evidence Bank, readiness y `cv-spec-v2` hash-bound; una
   spec nueva requiere aprobación humana e invalida sus derivados anteriores.

## Routing determinista

| Pedido | Ruta mínima |
| --- | --- |
| CV general | C00 → C01 → C02 → C06 → C08 |
| CV para vacante | C00/C01 → C04 → C05 → C06 → C08 |
| Carta | C04 → C05 → C07 → C08 |
| Búsqueda | C00 → C02 → C03 → C04 |
| Ciclo integral | C00 → C01 → C02 → C03 → C04 → C05 → C06/C07 → C08 → C09 |

Una intervención puede reanudar C05–C08 solo si candidato, evidencia, vacante y
ownership siguen vigentes. Empate o identidad irresoluble produce R0/`BLOCKED`.

## Dispatch

- C01: `candidate-evidence-reconciler`; delega en `career-evidence-interviewer`
  solo ante gaps materiales. Pausa/reanudación conserva el hash de sesión.
- C03–C04: `career-opportunity-finder`.
- C06: `evidence-first-cv`, con `CR_CAREER_EVIDENCE_READY` y
  `CR_CV_SPEC_APPROVED` antes de compilar.
- C07: `evidence-based-cover-letter`.
- C08 requiere verifier distinto del producer.
- C09 solo prepara preview y autorización en `local-evaluation`.

Carga el brief, contrato compartido, paso activo y una skill principal. No
cargues las cinco skills ni C00–C09 simultáneamente.

## Estados

La máquina profesional es independiente: `DISCOVERED`, `VALIDATED`,
`SHORTLISTED`, `PACKAGED`, `DRAFTED`, `SUBMITTED`, `BLOCKED`, `CLOSED`,
`REJECTED`, `INTERVIEW`, `OFFER`. Solo una confirmación material permite
`SUBMITTED`; llenar campos no basta. Cualquier cambio del job snapshot, CV,
carta, respuestas o canal invalida una autorización previa.

## Invariantes

- `verified` y `user_confirmed` pueden respaldar claims; `inferred` y `missing`
  solo expresan gaps o hipótesis.
- Un requisito de la vacante nunca se convierte en capacidad del candidato.
- PII, documentos reales, trackers y receipts de candidatura quedan en estado
  privado ignorado.
- CAPTCHA, OTP, acuerdo legal, pregunta sensible, prueba o entrevista grabada
  requieren intervención humana.
- Sin adapter, allowlist, preview congelado y autorización hash-bound, C09 se
  detiene sin efecto externo.
- `DRAFTED != SUBMITTED`; merge o QA no autorizan envío.
- `RENDERED_DRAFT != HUMAN_APPROVED != READY != PUBLISHED`; estas fases de
  artefacto tampoco equivalen a `SUBMITTED`.

## Salida mínima

Devuelve intent, brief, ruta, work orders, gaps, estado, `spec_id`,
`spec_sha256`, artefactos hash-bound y siguiente gate. Receipts registran
decisiones y evidencia, nunca razonamiento
privado. Los modelos versionados están en
`schemas/career-application-contract-v1.schema.json`.

## Stop rules

Detente ante candidato ambiguo, más de una candidatura coincidente, evidencia
contradictoria no resuelta, vacante no fijada para personalización, spec ausente,
no aprobada o stale, output inexistente, `UNKNOWN`, PII destinada a Git o efecto
externo no autorizado.

## Done

Brief canónico creado; ruta mínima resoluble; C06 condicionado por una spec
aprobada; primary skill y verifier declarados; estado y próximo gate
inequívocos; cero envío, publicación o claim de `SUBMITTED` sin receipt material.
