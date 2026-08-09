---
name: evidence-based-cover-letter
description: This skill should be used when the user asks to "escribir una cover letter", "personalizar una carta para esta vacante", "crear una respuesta corta de formulario", "redactar un mensaje a recruiter", or audit a letter against candidate evidence.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Evidence-Based Cover Letter

Redacta cartas y mensajes que conectan necesidades vigentes de una vacante con
evidencia autorizada del candidato. Complementa el CV; no lo resume ni compensa
gaps con entusiasmo. [METODOLOGIA][CONFIG]

## Preflight

Exige `candidate_id`, `CBRIEF-*` aprobado, job snapshot íntegro y vigente,
Requirement–Evidence Map, CV/package de referencia, idioma y canal. Un contacto
solo puede usarse si está públicamente asociado a la vacante o empresa. Si falta
la vacante o evidencia central, devuelve `BLOCKED` con el dato exacto requerido.

## Flujo C07

1. Extrae máximo tres necesidades del rol y una señal verificable de empresa.
2. Selecciona una o dos evidencias fuertes, recientes y permitidas para `letter`.
3. Define argumento: valor → evidencia/método → relación con necesidad →
   invitación concreta.
4. Redacta en BLUF para recruiter o hiring manager, sin aperturas genéricas.
5. Produce solo las variantes requeridas: carta, formulario o mensaje.
6. Audita claims, repetición contra CV, placeholders, contacto, idioma, tono y
   presupuesto del canal.
7. Emite omission record, hashes y próximo gate `CR_PACKAGE_QA`.

## Presupuestos

- Carta: 180–280 palabras.
- Formulario: 80–140 palabras, salvo límite explícito menor.
- Mensaje/saludo: 40–70 palabras.

Los límites de caracteres del canal prevalecen. Reducir repetición y adjetivos
antes de quitar evidencia.

## Reglas editoriales

- La apertura comunica contribución antes de motivación personal.
- Usa máximo una idea central ya presente en el resumen del CV.
- No lista herramientas sin contexto ni promete resultados futuros.
- Diferencia experiencia demostrada, aplicación posible y plan de adaptación.
- No elogia a la empresa sin una señal pública fijada en el job snapshot.
- Español es fallback solo cuando el contrato de intent conserva `unknown` y no
  existe señal fiable; una vacante con idioma definido manda.

## Outputs

Markdown canónico y HTML derivado para la carta, variantes de canal solicitadas,
omission record y manifest conforme a
`schemas/cover-letter-package-v1.schema.json`. El HTML permanece offline y no
introduce texto editorial adicional.

## Stop rules

Bloquea vacante obsoleta, necesidad no trazable, claim `inferred|missing`,
contacto supuesto, placeholder residual, nombre/cargo incorrecto, idioma
contradictorio, repetición excesiva, output inexistente o intento de enviar.

## Done

Cada claim material referencia evidence ID; al menos una necesidad explícita
queda respondida; canal, idioma y extensión pasan; la carta añade contexto al
CV; paquete queda `DRAFTED`, nunca `SUBMITTED`.
