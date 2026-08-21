---
name: content-os-sensitive-signal-detector
description: This skill should be used when a class, workshop, interview, demo, screen recording, or student-deliverable workflow must inventory names, faces, logos, brand text, URLs, emails, file paths, avatars, tool chrome, or spoken brands before privacy planning or publication.
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  version: 0.1.0
  lifecycle_state: candidate
  execution_scope: local-candidate-evaluation
---

# ContentOS Sensitive Signal Detector

Crear `sensitive-signal-inventory-v1` antes de decidir o ejecutar censura. Esta skill
detecta señales; no decide `KEEP`/`PROTECT`, no modifica media y no autoriza publicación.

## Secuencia

1. Verificar bytes físicos de fuente, caso, actor y registros hash-bound de aliases y
   plantillas.
2. Exigir cobertura declarada para texto visual, plantillas, rostros y audio. `UNKNOWN`
   bloquea. En este candidato data-only, `NOT_PRESENT` visual no se acredita; audio solo
   lo admite cuando la fuente declara materialmente que no contiene audio.
3. Combinar OCR con cajas, aliases ortográficos, plantillas visuales y transcript. Cada
   hallazgo conserva región, frames o tiempo, modalidad, confianza y evidencia.
4. Emitir nombres, rostros, logos, texto de marca, URLs, emails, rutas, avatares, chrome
   de herramientas y marcas habladas como señales separadas y deterministas.
5. Entregar el inventario al planner. Nunca convertir una detección en máscara o permiso.

## Reglas

- Alias parcial de cuatro o más caracteres produce hallazgo trazable, no certeza inventada.
- Plantillas, fuente y evidencia deben incluir bytes y SHA-256; drift físico, base64 no
  canónico, ID desconocido o ref no canónica bloquea.
- Un rostro requiere observación manual hash-bound en esta versión. `FACE_AUTO` y cualquier
  modelo no registrado son `coverage_gap`, no una capacidad implícita.
- Cobertura y observaciones requieren recibos JSON canónicos ligados a la fuente, modalidad
  y actor previsto. Plantillas y rostros manuales no superan `REVIEW_REQUIRED` en modo
  data-only.
- `CONFIRMED`, `REVIEW_REQUIRED` y `UNKNOWN` describen evidencia, no sensibilidad. Toda
  confianza `UNKNOWN` mantiene `BLOCKED_SIGNAL_CONFIDENCE_UNKNOWN`.
- Dos reapariciones de una señal conservan spans distintos. No se rellena el intervalo.
- No guardar razonamiento privado, locators absolutos, campos extra, red, reloj o azar.

## Contrato y uso

El inventario es estricto, secuenciado y hash-bound mediante JSON canónico. Su verificador
público exige también el request físico y rederiva el resultado; un hash autocontenido no
acredita autoridad. Todas las estructuras rechazan claves no declaradas.

```bash
node skills/content-os-sensitive-signal-detector/scripts/detect-sensitive-signals.mjs request.json
node skills/content-os-sensitive-signal-detector/scripts/check-skill.mjs
```

## Stop rules

- Cobertura o confianza desconocida: bloquear y pedir revisión.
- Hash/bytes, alias, plantilla, evidencia, span o geometría inválidos: FAIL.
- Solicitud de redacción, render, upload, publish o `READY`: fuera de alcance.
- Inventario válido: máximo `candidate`; requiere Verifier, Guardian e integración H03.
