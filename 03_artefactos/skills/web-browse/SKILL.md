---
name: web-browse
description: This skill should be used when the user wants to browse or navigate web pages interactively to gather context, describing the capability and required confirmation before any browser launch or network access is performed.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# web-browse

Skill homólogo H-03. Describe la capacidad de navegación interactiva de páginas web y la frontera fail-closed que la contiene. Es una herramienta: el agente la invoca para entender qué hace el binario de browse y cuándo pedir confirmación, no para ejecutarlo por su cuenta.

## Qué hace

`browse` opera un navegador headless persistente (Chromium vía Playwright) expuesto como un daemon de comandos. Toma páginas web que requieren interacción viva — navegación, clicks, llenado de formularios, capturas de pantalla, diffs de estado, layouts responsivos, uploads, diálogos — y devuelve evidencia observable: snapshots del árbol de accesibilidad con `@ref` para selección, texto limpio, HTML, links, media, console, network, screenshots anotados y PDFs.

El daemon persiste estado entre llamadas (cookies, tabs, sesiones de login), con ~100ms por comando tras un arranque único de ~3s. Es la vía para dogfooding de flujos UI, QA de despliegues, evidencia visual para bugs y verificación de páginas renderizadas.

## Cuándo usarlo

- Navegar una URL y verificar que carga (contenido, JS errors, requests, elementos clave).
- Testear un flujo de usuario (login, form fill, submit, diff de estado).
- Capturar evidencia visual para un bug (screenshot anotado, console log).
- Verificar layouts responsivos (mobile, tablet, desktop).
- Comparar entornos (staging vs prod) o renderizar HTML local a PNG/PDF.

## Cuándo NO usarlo

- Fetch estático de HTML/Markdown limpio — usar fetch directo, ~0ms vs ~3s de arranque del navegador.
- Conversión de archivos locales — usar skills dedicadas.
- Lectura de una sola URL en contexto del agente — fetch directo es suficiente.
- Crawling batch de muchas URLs — usar una skill de crawling.

## Frontera fail-closed (NO negociable)

Esta skill describe la capacidad. **NUNCA** la ejecuta por iniciativa propia.

- **NUNCA** auto-lanzar el navegador, el daemon `browse`, ni Chromium sin confirmación explícita del usuario.
- **NUNCA** auto-navegar a una URL ni abrir conexiones de red sin confirmación explícita.
- **NUNCA** auto-instalar dependencias, construir el binario, ni ejecutar `setup` sin confirmación explícita.
- **SIEMPRE** requerir confirmación explícita del usuario antes de cualquier lanzamiento de navegador, navegación o acceso de red.
- **SIEMPRE** que el tooling no esté presente o la confirmación no llegue, marcar `coverage_gap` y detenerse.

El receipt `receipts/runtime-boundary.yml` registra esta frontera: `network_allowed: false`, `execution_boundary: requires_user_confirmation`.

## Manejo de sesión

El daemon `browse` es persistente: el primer comando auto-arranca (~3s), los siguientes son ~100ms. El estado (cookies, tabs, localStorage, sesiones de login) sobrevive entre llamadas. Un `snapshot` entrega `@e`/`@c` refs para selección de elementos; los refs se invalidan tras navegación — re-ejecutar `snapshot` después de `goto`. En `handoff` (CAPTCHA, MFA, OAuth), el navegador abre Chrome visible, el usuario resuelve, y `resume` reanuda con el estado preservado.

## Salida

Salida esperada de `browse` (cuando se ejecuta con confirmación):

- **snapshot** — árbol de accesibilidad con `@ref` para interactuar.
- **text / html / links / media** — contenido leído de la página.
- **screenshot / responsive / pdf** — evidencia visual escrita a disco.
- **console / network** — diagnóstico de errores y requests.
- **diff** — delta de estado entre dos snapshots.

## coverage_gap

Sin el binario `browse` construido, sin el daemon disponible, o sin confirmación explícita del usuario, la skill no puede producir navegación ni evidencia de página. Marca `coverage_gap`, documenta la dependencia faltante o la confirmación pendiente, y detente. No sustituyas la ausencia con una inferencia pulida ni con un fetch alternativo no autorizado.

Derivada de browse (garrytan/gstack, MIT).
