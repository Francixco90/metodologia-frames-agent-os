---
name: web-hackernews-frontpage
description: This skill should be used when the user wants to fetch the Hacker News front page to summarize top stories and context, describing the capability and required confirmation before any network fetch is performed.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# web-hackernews-frontpage

Skill homólogo H-03. Describe la capacidad de obtener la portada de Hacker
News y resumir las historias destacadas, y la frontera fail-closed que la
contiene. Es una herramienta: el agente la invoca para entender qué hace la
capacidad y cuándo pedir confirmación, no para ejecutar el fetch por su
cuenta.

## Qué hace

Obtiene la portada de Hacker News (`news.ycombinator.com`) y devuelve las
historias visibles en la página principal, cada una con su rango, título, URL,
puntaje y conteo de comentarios. A partir de esa lista, el agente puede
producir un resumen de las historias más relevantes y el contexto técnico o
de discusión que las rodea.

La salida típica es una lista de historias (título, URL, puntos, comentarios)
seguida de un resumen narrativo de los temas dominantes en la portada.

## Cuándo usarlo

- El usuario pide ver qué está en la portada de Hacker News ahora mismo.
- El usuario quiere un resumen de las historias top de HN y su contexto.
- El usuario pregunta por tendencias técnicas o debates activos en HN.

## Cuándo NO usarlo

- Búsqueda de un término específico en HN — usar HN Algolia / búsqueda directa.
- Monitoreo continuo o programado de HN — este es un fetch puntual, no un
  watcher.
- Contenido de HN que requiere login o karma (votar, comentar, perfil) —
  fuera del alcance de un fetch read-only de la portada.

## Frontera fail-closed (NO negociable)

Esta skill describe la capacidad. **NUNCA** la ejecuta por iniciativa propia.

- **NUNCA** auto-fetchear `https://news.ycombinator.com` ni abrir ninguna
  conexión de red sin confirmación explícita del usuario.
- **NUNCA** auto-ejecutar binarios de navegador, scrapers ni clientes HTTP
  para obtener la portada sin confirmación explícita.
- **NUNCA** inferir o fabricar el contenido de la portada cuando no hay fetch
  confirmado — la ausencia no se sustituye con una inferencia pulida.
- **SIEMPRE** requerir confirmación explícita del usuario antes de cualquier
  fetch de red hacia Hacker News.
- **SIEMPRE** que la confirmación no llegue o el tooling no esté disponible,
  marcar `coverage_gap` y detenerse.

El receipt `receipts/runtime-boundary.yml` registra esta frontera:
`network_allowed: false`,
`execution_boundary: requires_user_confirmation`.

## Manejo de input

Entrada típica: petición de "portada de HN", "top stories de Hacker News", o
similar. El agente identifica la intención, describe la capacidad, propone el
fetch y solicita confirmación explícita — **sin ejecutarlo**. Solo tras
recibir la confirmación procede al fetch y al resumen.

## Salida

Salida esperada (cuando se ejecuta con confirmación):

- **stories** — lista de historias con rango, título, URL, puntos y conteo de
  comentarios.
- **summary** — resumen narrativo de las historias top y el contexto
  dominante en la portada.

## coverage_gap

Sin confirmación explícita del usuario, o sin tooling para realizar el fetch,
la skill no puede producir el contenido de la portada. Marca `coverage_gap`,
documenta la confirmación pendiente o la dependencia faltante, y detente. No
inventes historias ni resúmenes sin un fetch confirmado.

Derivada de hackernews-frontpage (garrytan/gstack, MIT).
