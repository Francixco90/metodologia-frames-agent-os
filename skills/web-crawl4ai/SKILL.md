---
name: web-crawl4ai
description: This skill should be used when the user wants to crawl web content using the crawl4ai tool, describing the capability and required confirmation before any binary execution, network call, or environment setup is performed.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# web-crawl4ai

Skill homólogo H-03. Describe la capacidad de crawling web con `crawl4ai` y la frontera fail-closed que la contiene. Es una herramienta: el agente la invoca para entender qué hace el herramienta y cuándo pedir confirmación, no para ejecutarla por su cuenta.

## Qué hace

`crawl4ai` orquesta un navegador headless (Playwright) más un pipeline de contenido markdown-aware. Toma páginas web que escapan a un fetch estático — sitios JavaScript-rendered, SPAs, contenido con login, scroll infinito, concurrencia multi-URL — y devuelve contenido estructurado: markdown limpio, HTML crudo, links, media y, si se configuró extracción, datos estructurados (JSON via CSS schema o LLM).

La biblioteca expone dos interfaces:

- **CLI** (`crwl`) — comandos rápidos, scriptables.
- **SDK Python** (`AsyncWebCrawler`) — control programático completo.

## Cuándo usarlo

- Páginas JavaScript-rendered o SPAs donde `fetch`/`defuddle` no alcanzan el contenido.
- Crawling concurrente de múltiples URLs.
- Extracción estructurada repetible con schemas CSS (sin LLM en runtime).
- Pipelines de datos web automatizados.

## Cuándo NO usarlo

- HTML estático (docs, blogs, news) — usar fetch directo, ~0ms cold start vs ~2s browser startup.
- Conversión de archivos locales (`.pdf`, `.docx`, `.pptx`, `.epub`).
- Lectura de una sola URL en contexto del agente — fetch directo es suficiente.
- Flujos UI mutantes (form fills, login + multi-step) — usar un navegador persistente dedicado.

## Frontera fail-closed (NO negociable)

Esta skill describe la capacidad. **NUNCA** la ejecuta por iniciativa propia.

- **NUNCA** auto-ejecutar el binario `crwl` ni invocar el SDK Python sin confirmación explícita del usuario.
- **NUNCA** auto-instalar dependencias (`pip install crawl4ai`, `crawl4ai-setup`, `crawl4ai-doctor`) sin confirmación explícita.
- **NUNCA** auto-fetchear URLs ni abrir conexiones de red sin confirmación explícita.
- **SIEMPRE** requerir confirmación explícita del usuario antes de cualquier ejecución de binario, llamada de red o setup de entorno.
- **SIEMPRE** que el tooling no esté presente o la confirmación no llegue, marcar `coverage_gap` y detenerse.

El receipt `receipts/runtime-boundary.yml` registra esta frontera: `network_allowed: false`, `execution_boundary: requires_user_confirmation`.

## Manejo de input

Entrada típica: una URL o una configuración seed (lista de URLs, sitemap, dominio). El agente recibe el input, valida que la fuente esté declarada, identifica el caso (fetch JS-heavy, batch, extracción schema, login, screenshot) y prepara el comando/invocación propuesto — **sin ejecutarlo**. La propuesta se entrega al usuario para confirmación.

## Salida

Salida esperada de `crawl4ai` (cuando se ejecuta con confirmación):

- **markdown** — markdown limpio y formateado.
- **html** — HTML crudo.
- **links** — links internos y externos descubiertos.
- **media** — imágenes, videos, audio encontrados.
- **extracted_content** — datos estructurados si se configuró extracción.

## coverage_gap

Sin el binario `crwl` instalado, sin el SDK Python disponible, o sin confirmación explícita del usuario, la skill no puede producir contenido crawled. Marca `coverage_gap`, documenta la dependencia faltante o la confirmación pendiente, y detente. No sustituyas la ausencia con una inferencia pulida ni con un fetch alternativo no autorizado.

Derivada de crawl4ai (brettdavies/crawl4ai-skill, MIT).
