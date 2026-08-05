---
name: web-scrape
description: This skill should be used when the user wants to scrape web page content into a structured local artifact, describing the capability and required confirmation before any browser launch, network fetch, or external tool invocation is performed.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Web Scrape — URL a artefacto estructurado local

Skill homóloga H-03. Convierte el contenido de una URL en un artefacto local estructurado (markdown, JSON o YAML) describiendo la capacidad, los contratos de entrada/salida y el perímetro fail-closed. Es solo descripción y planificación local: no lanza navegador, no abre red, no invoca herramientas externas, salvo confirmación explícita del usuario.

## Qué hace

Dado un URL y un selector o esquema de configuración, produce (o planea producir) un artefacto local con el contenido scrapeado estructurado:

- **Entrada**: URL de la página + configuración de extracción (selector CSS, esquema de campos, o descripción de la intención en una línea).
- **Salida**: artefacto local estructurado (`.md` / `.json` / `.yml`) con el contenido extraído, hash-bound y trazable. Nunca se publica, nunca se envía a un conector.
- **Alcance**: una página por invocación (one-shot). Sin crawls multi-página, sin auth flows, sin import de cookies, sin acciones mutadoras (submit, click, fill, login, delete). Solo lectura.

## Cuándo usar

- El usuario pide "scrapear", "extraer datos de", "pull from", "qué hay en" una página.
- El usuario quiere armar un artefacto local reutilizable a partir del contenido de una URL.
- El usuario quiere prototipar un flujo de extracción antes de convertirlo en skill permanente.

No usar para flujos mutadores (formularios, logins, clicks que cambian estado), multi-page crawls, ni nada que requiera autenticación o cookies. Esos son `coverage_gap` y se escalan.

## Fail-closed (no negociable)

- NUNCA lanzar navegador automáticamente. Sin confirmación explícita del usuario, no se arranca ningún browser, daemon, ni headless runtime.
- NUNCA hacer fetch de red automáticamente. Sin confirmación explícita del usuario, no se invoca `fetch`, `curl`, `wget`, ni ninguna herramienta de red.
- NUNCA invocar herramientas externas (vendor CLIs, binarios, plugins) sin confirmación explícita del usuario.
- NUNCA auto-ejecutar comandos del proyecto ni publicar; n8n permanece en dry-run.
- SIEMPRE requerir confirmación explícita del usuario antes de cualquier acción que abra red o lance un runtime externo.
- Solo evaluación, planificación y dirección local dentro del marco del repositorio. `execution_scope: local-evaluation`.

Una ausencia de confirmación no se sustituye por una inferencia pulida. Marca `coverage_gap` y escala antes de actuar. [CONFIG]

## Input

- `url`: URL de la página a scrapear (requerido).
- `selector | schema | intent`: configuración de extracción. Acepta un selector CSS, un esquema de campos (`{items: [{title, price}]}`) o una intención en una línea ("top stories on Hacker News").
- Opcional: formato de salida (`markdown` | `json` | `yml`), límites de profundidad, exclude selectors.

## Output

Un artefacto local estructurado con:

- Contenido extraído en el formato solicitado (uno, no pretty-printed si es JSON).
- `source_id` + `raw_sha256` del contenido fuente cuando aplique (procedencia verificable).
- Trazabilidad: el artefacto se registra según el contrato del inbox dual del repositorio.
- Stdout para datos; stderr/chat para logs. Sin prose alrededor del JSON salvo que el usuario pida explicación.

Si la extracción no produce un JSON sensible tras 3-4 intentos de selector, reportar lo probado, lo que volvió y el bloqueo (lazy-load, JS-render, paywall). No escribir resultado parcial y llamarlo done. No sugerir `/skillify` sobre un prototipo roto. [DOC]

## coverage_gap

Marca `coverage_gap` y escala cuando:

- Falta el URL o la configuración de extracción.
- La intención implica mutación (submit, login, click que cambia estado) —rechazar y enrutar a `/automate` o equivalentes.
- Se requiere autenticación, cookies, crawl multi-página, o red externa y no hay confirmación explícita del usuario.
- La página carga pero la extracción no rinde un shape estable tras intentos razonables.
- Aparece un secreto, PII, o contenido no solicitado.

## Validación

```
pnpm verify:skills
node skills/web-scrape/scripts/check-skill.mjs
```

Derivada de scrape (garrytan/gstack, MIT).
