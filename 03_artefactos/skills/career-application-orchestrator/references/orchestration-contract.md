# Contrato de orquestación profesional

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
crear `cv-spec-v1`; obtener `CR_CV_SPEC_APPROVED`; congelar `spec_sha256`; y
entregarlo al productor. Si cambia un binding, volver a draft y solicitar una
nueva aprobación. Un render nunca sustituye la spec ni autoriza promoción.

## Efectos

`local-evaluation` admite lectura y artefactos locales reversibles. Búsqueda
remota, completar formularios y enviar son capacidades no promovidas. C09 crea
un preview; no convierte intención del usuario en autorización de un uso.
