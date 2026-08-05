---
name: web-setup-browser-cookies
description: This skill should be used when the user wants to configure or import browser cookies for authenticated web sessions, describing the capability and required confirmation before any browser profile mutation or credential handling is performed.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# web-setup-browser-cookies

Skill homólogo H-03. Describe la capacidad de configurar e importar cookies de navegador para sesiones web autenticadas y la frontera fail-closed que la contiene. Es una herramienta: el agente la invoca para entender qué hace el capability y cuándo pedir confirmación, no para ejecutarlo por su cuenta.

## Qué hace

Importa sesiones autenticadas desde un navegador Chromium real del usuario hacia una sesión de navegador headless (típicamente Playwright). Permite que pruebas QA o automatizaciones web reutilicen cookies de sesión ya iniciadas — dominio por dominio — sin volver a loguearse.

El capability expone dos modos:

- **Picker UI** — abre una interfaz interactiva en el navegador del usuario donde selecciona qué dominios importar, con búsqueda, agregar (`+`) y eliminar (`trash`). Solo muestra nombres de dominio y conteos de cookies; nunca expone valores de cookie.
- **Import directo** — el usuario nombra un dominio explícito (ej. `github.com`) y se omite la UI, importando directamente las cookies de ese dominio desde el navegador detectado.

La sesión de navegador persiste las cookies entre comandos, así que las cookies importadas quedan disponibles inmediatamente para las siguientes operaciones.

## Cuándo usarlo

- Antes de QA testing sobre páginas autenticadas.
- Cuando el usuario pide "importar cookies", "login al sitio", o "autenticar el navegador".
- Cuando se necesita reutilizar una sesión iniciada en el navegador real sin volver a ingresar credenciales.

## Cuándo NO usarlo

- Si la sesión ya está conectada al navegador real del usuario via CDP (Chrome DevTools Protocol): las cookies y sesiones ya están disponibles; no se necesita importación.
- Para almacenar o reproducir credenciales sueltas fuera del flujo de cookies del navegador.
- Como sustituto de un gestor de secretos o bóveda de credenciales.

## Frontera fail-closed (NO negociable)

Esta skill describe la capability. **NUNCA** la ejecuta por iniciativa propia.

- **NUNCA** auto-importar cookies sin confirmación explícita del usuario.
- **NUNCA** auto-mutar el perfil del navegador del usuario (lectura, escritura, o eliminación de cookies) sin confirmación explícita.
- **NUNCA** manejar, loguear, o exponer credenciales o valores de cookie sin confirmación explícita — credenciales y cookies son material PII/sensible.
- **SIEMPRE** requerir confirmación explícita del usuario antes de cualquier importación de cookies, mutación de perfil de navegador, o manejo de credenciales.
- **SIEMPRE** que el tooling no esté presente o la confirmación no llegue, marcar `coverage_gap` y detenerse.

El receipt `receipts/runtime-boundary.yml` registra esta frontera: `network_allowed: false`, `execution_boundary: requires_user_confirmation`.

## Manejo de credenciales y PII

Las cookies de sesión y cualesquiera credenciales implicadas son material sensible. La skill describe el capability; el agente no toca cookies, valores de cookie, o credenciales sin confirmación explícita del usuario. El picker UI expuesto por el capability original solo muestra nombres de dominio y conteos — nunca valores de cookie. El agente no registra, transmite, ni persiste valores de cookie o credenciales. Cualquier resumen al usuario se limita a dominios y conteos.

## Manejo de input

Entrada típica: una petición de importar cookies, con o sin dominio explícito. El agente recibe el input, identifica el caso (picker UI, dominio directo, verificación de cookies ya importadas), valida si la sesión ya está conectada via CDP (en cuyo caso no se necesita importación), y prepara la invocación propuesta — **sin ejecutarla**. La propuesta se entrega al usuario para confirmación.

## Salida

Salida esperada del capability (cuando se ejecuta con confirmación):

- **Confirmación del usuario** antes de cualquier mutación de perfil o manejo de cookies.
- **Importación por dominio** — cookies de los dominios seleccionados cargadas en la sesión headless.
- **Resumen de dominios y conteos** — dominios importados y número de cookies por dominio, sin valores de cookie.
- **Verificación** — listado de dominios importados y conteos tras la operación.

## coverage_gap

Sin el binario del capability presente, sin confirmación explícita del usuario, o si la sesión ya está conectada via CDP (caso en el que la importación es redundante), la skill no puede importar cookies. Marca `coverage_gap`, documenta la dependencia faltante o la confirmación pendiente, y detente. No sustituyas la ausencia con una inferencia pulida ni con un manejo de credenciales no autorizado.

Derivada de setup-browser-cookies (garrytan/gstack, MIT).
