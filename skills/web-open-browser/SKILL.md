---
name: web-open-browser
description: This skill should be used when the user wants to open or launch a browser session for web interaction, describing the capability and required confirmation before any browser process or profile is started.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# web-open-browser

Skill homólogo H-03. Describe la capacidad de abrir o lanzar una sesión de navegador para interacción web y la frontera fail-closed que la contiene. Es una herramienta de descripción: el agente la invoca para entender qué hace la capacidad y cuándo pedir confirmación, no para arrancar un proceso de navegador por su cuenta.

## Qué hace

Lanza una sesión de navegador (proceso Chromium/Chrome y, opcionalmente, un perfil de usuario) para interacción web en vivo: páginas renderizadas, inspección visual, captura de pantalla, depuración de front-end, pruebas E2E o navegación asistida. La sesión puede ser:

- **Headless** — sin UI visible, ideal para CI, scraping y capturas programadas.
- **Interactiva** — ventana visible con perfil persistente, cookies, storage y sesión de usuario.

La capacidad cubre la apertura del proceso, la selección del perfil, el manejo de cookies/storage heredados y la elevación a una sesión lista para que un agente o un humano actúe sobre ella.

## Cuándo usarlo

- El usuario pide explícitamente "abrir el navegador", "lanzar Chrome", "iniciar una sesión de browser".
- Se necesita una sesión visual para inspección, depuración o captura que un fetch estático no resuelve.
- Pruebas E2E o de frontend que requieren un navegador real (no mocked).
- Navegación asistida donde el humano mantiene el control y el agente describe/observa.

## Cuándo NO usarlo

- HTML estático de una sola URL — fetch directo es suficiente y ~0ms cold start.
- Conversión de archivos locales (`.pdf`, `.docx`, `.pptx`, `.epub`).
- Crawling masivo automatizado — usar una skill de crawling dedicada.
- Cualquier flujo que pueda resolverse sin levantar un proceso de navegador.

## Frontera fail-closed (NO negociable)

Esta skill describe la capacidad. **NUNCA** la ejecuta por iniciativa propia.

- **NUNCA** auto-lanzar un proceso de navegador (`chrome`, `chromium`, `playwright`, `puppeteer`, etc.) sin confirmación explícita del usuario.
- **NUNCA** auto-cargar un perfil de usuario, cookies o storage heredado sin confirmación explícita. Un perfil contiene credenciales, historial y datos personales; cargarlo es un acto sensible que requiere autoridad.
- **NUNCA** auto-conectar a una sesión remota (CDP, DevTools Protocol, debugging port) sin confirmación explícita.
- **SIEMPRE** requerir confirmación explícita del usuario antes de cualquier arranque de proceso, carga de perfil o apertura de sesión.
- **SIEMPRE** que el binario no esté presente, el perfil no exista o la confirmación no llegue, marcar `coverage_gap` y detenerse.

El receipt `receipts/runtime-boundary.yml` registra esta frontera: `network_allowed: false`, `execution_boundary: requires_user_confirmation`.

## Manejo de perfiles y cookies

Un perfil de navegador concentra identidad: cookies de sesión, tokens de autenticación, historial, credenciales guardadas y storage local. Cargar un perfil existente equivale a actuar en nombre del usuario ante cualquier sitio que lo reconozca. Por eso:

- El agente describe qué perfil se usaría y por qué, pero no lo carga sin confirmación.
- Un perfil fresco (limpio, temporal) es la opción por defecto propuesta; reusar un perfil existente requiere justificación explícita del usuario.
- Cookies y storage nunca se exfiltran, se loguean ni se reenvían a terceros. Si la tarea necesita extraerlos, se trata como dato sensible y se pide confirmación adicional.

## Manejo de input

Entrada típica: una URL inicial, un nombre de perfil, un modo (headless/interactivo), o un caso de uso (depuración, captura, prueba E2E). El agente recibe el input, valida que la fuente esté declarada, identifica el caso y prepara el comando/invocación propuesto — **sin ejecutarlo**. La propuesta se entrega al usuario para confirmación.

## Salida

Salida esperada cuando se ejecuta con confirmación:

- **sesión de navegador** lista (PID, endpoint de depuración si aplica, perfil cargado).
- **estado** reportado al usuario: URL cargada, modo, perfil, visibilidad.
- **artefactos** acordados (screenshots, traces, logs) según el caso.

El output de un arranque exitoso **nunca** concede `HUMAN_APPROVED`, `READY` ni `PUBLISHED`. `RENDERED_DRAFT != FINAL`.

## coverage_gap

Sin el binario de navegador instalado, sin el perfil solicitado disponible, o sin confirmación explícita del usuario, la skill no puede producir una sesión. Marca `coverage_gap`, documenta la dependencia faltante o la confirmación pendiente, y detente. No sustituyas la ausencia con una inferencia pulida ni con un lanzamiento no autorizado "para ahorrar tiempo".

Derivada de open-gstack-browser (garrytan/gstack, MIT).
