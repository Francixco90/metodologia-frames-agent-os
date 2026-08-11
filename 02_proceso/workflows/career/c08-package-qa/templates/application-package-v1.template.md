---
schema_version: career-template-v1
template_id: TPL-C08-PACKAGE-QA
workflow_id: C08
state: DRAFT
next_gate: CR_PACKAGE_APPROVED
---

# Application Package Manifest

## 1. Candidate freeze

Package ID, candidate, application, job y hash canónico.

## 2. Spec y brief

`spec_id`, `spec_sha256`, aprobación exacta y brief dirigido cuando aplique.

## 3. Job snapshot

URL canónica, hash y vigencia revalidada.

## 4. CV y matriz de outputs

Fuente v2, ATS HTML/DOCX/PDF, HTML ejecutivo solicitado y hashes materiales.

## 5. Carta y mensajes

Variantes incluidas, canal, longitud e idioma.

## 6. Requirement–evidence map

Cobertura, gaps, blockers y decisiones de tratamiento.

## 7. Paridad e invalidación

Modelo semántico, proyecciones, diferencias permitidas y rechazo de cualquier binding stale.

## 8. ATS y visual

Texto seleccionable, orden, contraste, impresión y breakpoints.

## 9. Independencia

Producer, RT-09 y RT-11 distintos.

## 10. Riesgos

PII, spec/evidencia/vacante stale, claims, outputs ausentes y herramientas UNKNOWN.

## 11. Veredicto

PASS, REVISE o BLOCKED con evidencia; Guardian no remedia.

## 12. Siguiente gate

`CR_PACKAGE_APPROVED`; cambio posterior crea successor.
