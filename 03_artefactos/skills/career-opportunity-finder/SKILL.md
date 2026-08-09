---
name: career-opportunity-finder
description: This skill should be used when the user asks to "buscar vacantes", "encontrar empleos en LinkedIn", "priorizar oportunidades", "descartar roles demasiado senior", "puntuar fit", or create a governed job-search shortlist and follow-up queue.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Career Opportunity Finder

Normaliza, valida, deduplica y prioriza oportunidades desde snapshots
autorizados. LinkedIn es una fuente posible, no la identidad ni dependencia del
núcleo. En `local-evaluation` genera queries y procesa fixtures/imports; no
navega, extrae cookies ni postula. [METODOLOGIA][CONFIG]

## Preflight

Exige brief de búsqueda, `candidate_id`, familias principal/adyacente/stretch,
países y autorización laboral, modalidad, horario, salario mínimo, idiomas,
seniority, evidencia transferible y canales autorizados. Restricciones duras
faltantes producen preguntas; no se rellenan por conveniencia.

## Flujo C03–C04

1. Expande cada familia por problema, sinónimos, sector, país, modalidad y
   seniority; no depende de un título aislado.
2. Ingiere resultados o job snapshots desde una fuente autorizada.
3. Captura URL canónica, descripción íntegra, empresa, cargo, ubicación,
   modalidad, idioma, fecha de captura, canal y estado observado.
4. Deduplica por URL y luego empresa+cargo+ubicación; conflictos requieren
   revisión, no fusión destructiva.
5. Revalida vigencia antes de puntuar y antes de preparar candidatura.
6. Aplica requisitos duros y score explicable.
7. Separa principal, adyacente y stretch; reemplaza cerradas o incompatibles
   hasta satisfacer el objetivo de oportunidades válidas.
8. Emite Opportunity Inventory, Immutable Job Snapshot, Fit Scorecard, Ranked
   Shortlist y Follow-up Queue.

## Score 0–100

| Dimensión | Peso |
| --- | ---: |
| Evidencia para responsabilidades centrales | 30 |
| Requisitos duros | 20 |
| Ubicación, modalidad, horario y salario | 15 |
| Transferibilidad viable | 10 |
| Calidad y vigencia de publicación | 10 |
| Afinidad sectorial | 5 |
| Fricción de aplicación | 5 |
| Contacto legítimo | 5 |

Un requisito duro puede bloquear aunque el total sea alto. Cada componente
registra valor, evidencia y reason code; el total es la suma, sin bonus ocultos.

## Seguridad de fuentes

Conserva el snapshot capturado y su hash; una edición posterior no cambia la
decisión histórica. No usa credenciales, cookies, scraping no autorizado ni
contactos inferidos. `UNKNOWN` en vigencia, URL o requisito duro bloquea el
avance a `SHORTLISTED` hasta resolver.

## Handoff

Entrega modelos conforme a `schemas/job-opportunity-v1.schema.json`, query pack,
dedupe decisions, score breakdown, gaps, snapshot hash, estado y siguiente gate
`CR_APPLICATION_BRIEF`. Datos vivos permanecen privados.

## Stop rules

Bloquea vacante cerrada, URL no canónica, descripción incompleta, duplicado no
resuelto, restricción dura incumplida, score sin evidencia, publicación dudosa,
contacto no asociado, PII destinada a Git o solicitud de navegación/envío sin
adapter promovido.

## Done

Cada shortlist contiene solo vacantes vigentes y explicables; snapshots son
inmutables y hash-bound; score reproduce pesos; gaps y stretch son visibles;
cero efecto externo o claim de postulación.
