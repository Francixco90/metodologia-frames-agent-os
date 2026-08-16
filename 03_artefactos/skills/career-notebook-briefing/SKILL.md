---
name: career-notebook-briefing
description: This skill should be used when the user asks to "create a NotebookLM career briefing", "generate a daily job-search debrief", "keep a career notebook current", "turn a CV brand into a Studio visual prompt", or "create weekly job-search review artifacts".
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: private-career-notebook
  model_agnostic: true
---

# Career Notebook Briefing

Convertir un cierre factual de Career OS en derivados privados de NotebookLM Studio.
Mantener Markdown/CSV como autoridad; tratar decks, tablas, mapas e infografías
como proyecciones no deterministas. [METODOLOGIA]

## Preflight

1. Resolver el cierre canónico, sus hashes y la decisión visual vigente.
2. Leer `references/briefing-contract.md` y compilar la solicitud con
   `scripts/compile-briefing.mjs`.
3. Detectar `notebook_get`, sincronización de fuentes, `studio_create`,
   `studio_status` y `download_artifact` antes de mutar.
4. Confirmar el cuaderno con una lectura. No crear otro si el binding falla.
5. Mantener IDs, locators, candidaturas, CV y recibos reales en raíz privada.

## Flujo diario

1. Cerrar búsqueda, postulaciones, inbox y follow-up antes del briefing.
2. Normalizar métricas únicas. Separar conversaciones de asignaciones de labels.
3. Calcular `daily_debrief_sha256` desde fuentes, métricas y autoridad visual.
4. Emitir `NO_MATERIAL_DELTA` cuando el hash ya exista; no consumir Studio.
5. Sincronizar únicamente las fuentes ligadas y comprobar ausencia de duplicados.
6. Crear deck, tabla y mapa con títulos fechados y revisión `rN`.
7. Los domingos crear deck e infografía semanales después del paquete diario.
8. Consultar estado hasta completar o agotar el timeout; descargar evidencia privada.
9. Registrar IDs, hashes, estado, fuentes y prompt. No declarar PASS por retorno de API.

Usar `assets/visual-style-prompt.md` para el estilo y
`assets/briefing-outlines.md` para la estructura. Resolver colores y tipografía
desde el design system observado; no mantener una segunda paleta manual.

## Estados

- `STUDIO_READY_FOR_HUMAN_REVIEW`: artefactos completos, ligados y revisados.
- `NO_MATERIAL_DELTA`: fuentes vigentes sin cambio semántico.
- `UNAVAILABLE`: capability ausente.
- `BLOCKED_AUTH`: capability presente sin sesión válida.
- `PARTIAL`: solo una parte del paquete terminó o fue verificable.

Ante cualquier estado distinto de READY, conservar el briefing local y Drive.
Reanudar sin duplicar cuando vuelva la capacidad. [CONFIG]

## Guardrails

- No compartir, publicar, invitar, borrar notebooks ni reemplazar históricos.
- No convertir inferencias, keywords o requisitos en hechos del candidato.
- No contar dos veces una conversación con varios labels.
- No usar Studio como fuente de métricas ni como evidencia de accesibilidad.
- No versionar PII, IDs de notebook, URLs firmadas, locators o hashes de contacto.
- No conceder `HUMAN_APPROVED`, `READY` ni `PUBLISHED`.

## Done

```sh
node 03_artefactos/skills/career-notebook-briefing/scripts/check-skill.mjs
```

Exigir además privacidad, ownership, verificación visual y revisión humana.
