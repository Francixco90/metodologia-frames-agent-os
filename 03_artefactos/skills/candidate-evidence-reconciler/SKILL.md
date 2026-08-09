---
name: candidate-evidence-reconciler
description: This skill should be used when the user asks to "reconciliar mi experiencia", "comparar versiones de mi CV", "validar mis claims", "resolver contradicciones", or build a canonical evidence bank before a career document.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Candidate Evidence Reconciler

Construye la fuente canónica privada que CV, carta y candidatura consumen. No
redacta marketing ni cambia hechos para mejorar fit. [METODOLOGIA][CONFIG]

## Entrada

Recibe `candidate_id`, fuentes autorizadas, restricciones, familias de rol y
claims previos. Clasifica cada fuente por autoridad y fecha de captura. Nunca
versiona PII, documentos laborales reales ni locators locales.

## Flujo

1. Inventaría fuentes y calcula hashes materiales.
2. Extrae experiencia, proyectos, formación, idiomas, herramientas, resultados
   y preferencias sin completar huecos.
3. Normaliza cada elemento con `evidence_id`, claim, contexto, acción/método,
   resultado, métrica, `source_ref`, confianza, canales y límites.
4. Agrupa formulaciones equivalentes sin perder la fuente original.
5. Detecta contradicciones de fecha, cargo, seniority, métrica, formación,
   idioma, ubicación y autorización laboral.
6. Marca `verified`, `user_confirmed`, `inferred` o `missing`.
7. Emite Evidence Bank, Contradiction Ledger y Evidence Gap Report.

## Reglas de confianza

- `verified`: evidencia material autorizada y hash-bound.
- `user_confirmed`: declaración explícita del candidato; nunca se presenta como
  documento independiente.
- `inferred`: lectura plausible, utilizable solo como pregunta o hipótesis.
- `missing`: ausencia explícita.

Solo `verified` y `user_confirmed` pueden alimentar un claim. Cambiar confianza,
hecho o restricción crea un evento sucesor; no reescribe historia.

## Métricas y credenciales

Una métrica requiere valor, unidad, contexto, periodo y límite. Un objetivo no
es un resultado. Formación o asistencia no equivale a certificación ni dominio.
Cuando no hay cifra, conserva cambio observable, alcance, riesgo reducido o
decisión habilitada sin inventar precisión.

## Handoff

Entrega el modelo de `schemas/candidate-evidence-bank-v1.schema.json`, hashes de
fuentes, contradicciones, claims habilitados/prohibidos, gaps bloqueantes y no
bloqueantes, y próximo owner. El documento público recibe IDs y formulaciones
aprobadas; nunca la fuente privada completa.

## Stop rules

Bloquea una afirmación ante fuentes incompatibles, autoridad desconocida,
`source_ref` inexistente, métrica incompleta, requisito de vacante usado como
evidencia o instrucción de inflar experiencia. La tarea puede continuar con
gaps no críticos, pero no degradarlos a warning silencioso.

## Done

Cada claim material tiene fuente y confianza; contradicciones y límites son
visibles; no existe PII versionada; downstream puede seleccionar evidencia sin
reinterpretar hechos.
