# Contrato de orquestación profesional

## Autoridad A0

`01_intencion/career/career-os-operating-contract-v2.md` gobierna routing, gates
e invalidación. La cadena normativa es
`cv-spec-v2 → cv-source-v2 → cv-package-v3`, pero la migración material de
C06/C07, templates y registry queda en
`coverage_gap: A1_MATERIAL_MIGRATION_REQUIRED`. Una dependencia v1 bloquea el
run nuevo; no se presenta como runtime v2. [CONFIG]

## Autoridad y privacidad

Las fuentes de requisitos registradas son autoridad de implementación, no
evidencia laboral. Un perfil real y sus candidaturas viven en estado privado;
fixtures versionados son sintéticos. [METODOLOGIA][CONFIG]

## Briefs

Todo recorrido produce un brief Markdown canónico antes de generar documentos.
Debe declarar resultado, pedido interpretado, audiencia, evidencia, propuesta,
pasos, entregables, skills, riesgos, aceptación, diagrama y siguiente gate. HTML
solo proyecta el mismo modelo y hash.

## Handoffs

Cada paso entrega `candidate_id`, `application_id` cuando exista, inputs y
outputs con hash, estado anterior/posterior, claims usados/omitidos, gaps,
owner, verifier y siguiente gate. El receptor rechaza referencias inexistentes,
hashes obsoletos o estados no permitidos.

## Preflight Spec-First de CV

Antes de compilar C06, verificar brief, Evidence Bank y vacante cuando aplique;
crear `cv-spec-v2`; obtener `CR_CV_DESIGN_APPROVED` cuando exista proyección
ejecutiva; obtener `CR_CV_SPEC_APPROVED`; congelar `spec_sha256`; y entregar la
spec al productor. Si cambia un binding, volver a draft y solicitar una nueva
aprobación. A0 no afirma que C07 o los templates ya consuman v2.

`CR_CAREER_EVIDENCE_READY` es manual porque no existe command run-aware.
`CR_CV_COMPILED` ejecuta `pnpm verify:career` solo como baseline estático del
arnés; nunca prueba el run. `CR_PACKAGE_APPROVED` y G14 son manuales, siendo G14
una revisión Guardian independiente. `CR_PACKAGE_QA` es un boundary legacy aún
referenciado por skills activas, sin command/receipt: produce
`coverage_gap: A1_PACKAGE_QA_REFS_REQUIRED`, stop y nunca `PASS`. [CONFIG]

## Efectos

`local-evaluation` admite lectura y artefactos locales reversibles. Búsqueda
remota, completar formularios y enviar son capacidades no promovidas. C09 crea
un preview y se detiene en `CR_PACKAGE_APPROVED`. `packageReady=true` no permite
solicitar `CR_SUBMISSION_AUTHORIZED`; hace falta un receipt material futuro.
