---
name: metodologia-find-skills
description: This skill should be used when the user asks to "find a skill for X", "discover MetodologIA skills", "what skills are available", "search the skill registry", or wants to locate a capability in the local skill ecosystem before building from scratch.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires the v2 and H-03 skill registries and the vendor reference tree.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-skill-discovery
---

# MetodologIA Find Skills

Resolver la búsqueda de capacidades dentro del ecosistema de skills de MetodologIA antes de construir desde cero. Mapear la intención del usuario al inventario local (v2 + H-03 + vendor reference) y presentar opciones accionables. Derivada de find-skills (vercel-labs/skills, MIT).

## Cuándo usar

Usar esta skill cuando el usuario:

- Pregunta "¿hay una skill para X?" o "busca una skill para X"
- Quiere saber qué skills existen en el repositorio
- Pide extender una capacidad y conviene verificar si ya existe
- Necesita localizar un workflow, plantilla o contrato antes de autorarlo
- Quiere explorar el catálogo de homólogos o vendor references

## Inventarios locales (orden de consulta)

1. **v2 registry** — `registries/skills/skill-registry.yml` — familia meta `metodologia-*`, `instagram-*`, `scroll-*`, `remotion-video-production-v2` (10 entries). Validador: `scripts/check-instagram-v2-skills.ts` (SKL-V2).
2. **H-03 registry** — `registries/skills/creation-v3-skill-registry.yml` — catch-all de homólogos por dominio (`design-*`, `dev-*`, `context-*`, `web-*`, `media-*`, `gstack-*`). Validador: `scripts/check-creation-v3-skills.ts` (SKL-H03).
3. **Vendor reference** — `skills/vendor/<publisher>/<skill>/SKILL.md` — texto de referencia auditable (MIT/Apache-2.0), `execution_status: reference-only-no-auto-execution`. NO son skills ejecutables; son fuente para homólogos.
4. **Reconcile gate** — `scripts/reconcile-skill-registries.ts` — confirma 0 drift entre v2 + H-03 en cada `pnpm verify:skills`.

## Cómo buscar

### Paso 1 — Identificar dominio y tarea

Determinar: dominio (design, dev, context, web, media, gstack-internal) + tarea específica (review, debugging, memory, scrape, pdf, motion, etc.).

### Paso 2 — Consultar registros locales antes de buscar externamente

Listar entries por prefijo de familia. Ejemplo:

- Usuario pide "skill para debugging sistemático" → buscar `dev-systematic-debugging` en H-03.
- Usuario pide "skill de identidad de marca" → buscar `metodologia-brand-router` en v2.
- Usuario pide "remover fondo de imágenes" → buscar `media-rembg` en H-03 (fail-closed, requiere confirmación).

Si existe un homólogo activo, recomendarlo. Si solo existe vendor reference, notar que el homólogo está pendiente (Fase 2).

### Paso 3 — Vendor reference como respaldo

Si no hay homólogo, revisar `skills/vendor/` para ver si hay vendor reference que pueda inspirar un homólogo futuro. NO ejecutar el vendor (reference-only). NO recomendar `npx skills add` sin confirmación explícita del usuario (fail-closed: activar conectores externos requiere gate).

### Paso 4 — Verificar calidad antes de recomendar

Antes de recomendar una skill existente:

1. **lifecycle_state** — solo `active` es ejecutable. `quarantined`/`evaluated` son pendientes.
2. **execution_scope** — confirmar que matchea el contexto (`local-evaluation`, `local-skill-discovery`, etc.).
3. **LINEAGE** — revisar `authority_refs` + `derivation_mode` para trazabilidad.
4. **production_runtime_status** — `publication_blocked`/`blocked_license_coverage_gap` indican restricciones.

### Paso 5 — Presentar opciones

Para cada skill encontrada, presentar: nombre, qué hace, familia (v2/H-03), estado, comando de validación (`pnpm verify:skills`).

## Fail-closed

- **NO ejecutar `npx skills`** ni ningún CLI externo sin confirmación explícita del usuario. MetodologIA no activa conectores ni publica.
- **NO ejecutar vendor scripts** (reference-only, non-executable).
- **NO recomendar instalación externa** (`npx skills add`) sin gate. El ecosistema local es la fuente de verdad.
- Skill discovery local = lectura de registries + vendor dirs. Sin red, sin instalación, sin publicación.

## Categorías por familia

| Familia   | Prefijo                                    | Dominio                    | Ejemplos                                                |
| --------- | ------------------------------------------ | -------------------------- | ------------------------------------------------------- |
| meta (v2) | `metodologia-*`, `instagram-*`, `scroll-*` | brand, carousel, scroll    | metodologia-brand-router, scroll-experience-foundations |
| design    | `design-*`                                 | visual/UI                  | design-impeccable, design-framer-motion                 |
| dev       | `dev-*`                                    | workflow                   | dev-spec, dev-systematic-debugging, dev-ponytail        |
| context   | `context-*`                                | memoria/contexto           | context-memory, context-save                            |
| web       | `web-*`                                    | scrape/browse              | web-crawl4ai, web-scrape                                |
| media     | `media-*`                                  | media tools                | media-rembg, media-make-pdf                             |
| gstack    | `gstack-*`                                 | producto-interno (stretch) | gstack-router, gstack-ios-sync                          |

## Cuando no se encuentra

Si no hay skill local ni vendor reference:

1. Confirmar que no existe en los tres inventarios.
2. Ofrecer autorar un homólogo nuevo vía el proceso de homólogo (clean-room prose from permissive reference).
3. NO inferir capacidades faltantes como existentes. Marcar `coverage_gap` si el usuario asume una skill que no está.

## Validación

```bash
pnpm verify:skills   # v2 + H-03 + reconcile (0 drift esperado)
```
