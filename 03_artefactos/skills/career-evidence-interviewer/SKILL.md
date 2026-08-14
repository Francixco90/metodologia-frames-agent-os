---
name: career-evidence-interviewer
description: This skill should be used when a career request lacks clear achievements, strengths, competencies, chronology, attribution, or supporting evidence; when the user asks to discover professional value; or when Career OS must decide whether to ask follow-up questions before positioning or CV compilation.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Career Evidence Interviewer

Convierte insumos profesionales dispersos en evidencia verificable o en vacíos
explícitos. Opera antes de posicionamiento, CV y diseño. No redacta claims finales,
no publica y no sustituye la confirmación humana. [METODOLOGIA][PEDAGOGIA]

## Preflight

1. Carga solo las fuentes privadas autorizadas y la evidencia Career vigente.
2. Inventaría CV anteriores, certificados, evaluaciones, roles, proyectos,
   resultados, aspiraciones y evidence bank vigente.
3. Valida identidad, hashes, autoridad y contradicciones antes de preguntar.
4. Clasifica cada vacío como cronología, logro, competencia, métrica,
   atribución, familia profesional, contradicción o evidencia.

## Decisión de entrevista

- Omite preguntas ya resueltas por fuentes consistentes y evidencia promotable.
- Abre entrevista solo si un vacío material impide `CR_CAREER_EVIDENCE_READY`.
- Formula máximo tres preguntas por ronda y cuatro rondas por sesión.
- Pausa y conserva estado si la persona no desea continuar o necesita revisar
  documentos. Reanuda desde el hash de sesión, nunca desde memoria informal.
- Cierra en `READY_FOR_CONFIRMATION` únicamente con rondas completas, referencias
  resueltas y vacíos cerrados o aceptados de forma explícita.

## Secuencia adaptativa

Pregunta solo lo necesario y avanza desde hechos hacia límites:

1. **Contexto:** alcance, periodo, equipo, mercado o responsabilidad.
2. **Reto:** condición inicial y por qué importaba.
3. **Acción:** decisión o intervención atribuible a la persona.
4. **Resultado:** cambio observado; solicita métrica solo si existe.
5. **Atribución:** separa contribución individual, del equipo y organizacional.
6. **Evidencia:** identifica fuente, fecha y posibilidad de verificación.
7. **Límite:** registra qué no puede afirmarse o dónde hay incertidumbre.

Usa contrastes neutrales para ayudar a reconocer experiencia: “¿Fue una mejora
de velocidad, calidad, adopción, ingreso, capacidad o riesgo?”. No sugieras una
cifra ni conviertas una responsabilidad común en logro. [PEDAGOGIA]

## Política de evidencia

- Etiqueta una hipótesis como `[INFERENCIA]` y mantenla solo en canal entrevista.
- Promueve a `user_confirmed` únicamente tras confirmación explícita respaldada
  por una respuesta de la persona.
- Promueve a `verified` solo cuando la autoridad observada también sea verified.
- Mantén aspiraciones, keywords y requisitos externos como gaps de desarrollo.
- Conserva atribución y límites en cada achievement, competency o strength.
- Rechaza drift de candidate, evidence bank, fuente, sesión o packet.

Considera una dimensión suficiente cuando existe una afirmación delimitada,
fuente autorizada, confianza compatible, atribución explícita y límite. Una
responsabilidad sin intervención ni resultado sigue siendo contexto, no logro.

## Outputs

Produce, en estado privado y hash-bound:

- `career-discovery-session-v1` con inventario, gaps, rondas y siguiente gate;
- `evidence-candidate-packet-v1` con hipótesis y evidencia reconciliada;
- `career-evidence-readiness-v1` con checks materiales y estado fail-closed.

Entrega `CR_CAREER_EVIDENCE_READY` solo cuando el packet contiene evidencia de
competencias e intervenciones recientes, todas las referencias resuelven y no
quedan gaps bloqueantes. `UNKNOWN` o evidencia ausente nunca equivalen a PASS.

## Stop rules

Detén ante PII fuera de la raíz privada, fuente sin hash, respuesta inducida,
contradicción no resuelta, atribución ambigua, evidencia inferred promovida,
requisito de vacante usado como experiencia, más de tres preguntas por ronda o
más de cuatro rondas. Ningún output autoriza CV, publicación o postulación.

## Done

```sh
node 03_artefactos/skills/career-evidence-interviewer/scripts/check-skill.mjs
```

Exige además `verify:career`, privacidad, ownership y Guardian independiente.
