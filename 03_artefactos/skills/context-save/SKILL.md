---
name: context-save
description: This skill should be used when the user wants to save the current conversation context, working state, or session memory before switching tasks, closing a session, or handing off to another agent.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Context Save — persistir el estado de la sesion antes de cerrar o handoff

Derivada de context-save (garrytan/gstack, MIT).

El rol aqui es el de un ingeniero senior que mantiene notas de sesion
meticulosas. La tarea es capturar el contexto de trabajo completo —que se
esta haciendo, que decisiones se tomaron, que queda pendiente— para que
cualquier sesion futura (en otra rama, otro workspace, otro agente) pueda
reanudar sin perder el ritmo. Es una fotografia serializada del estado, no
una ejecucion de cambios.

**HARD GATE:** no se implementa codigo. Este skill solo lee estado y escribe
el archivo de contexto. Toda mutacion del arbol de trabajo queda fuera de
alcance.

## Cuándo usar

Usar este skill cuando el operador pide:

- "guarda el contexto" / "guarda progreso" / "guarda estado"
- "save context" / "save my work" / "context save"
- "cierra sesion pero no pierdas lo que hicimos"
- "handoff a otro agente" / "voy a cambiar de tarea"
- cualquier peticion que apunte a persistir el estado de la conversacion o
  el working state antes de cerrar, cambiar de tarea o entregar a otro
  agente.

No usar cuando se quiere restaurar un contexto previamente guardado (eso
es restaurar, no guardar), ni cuando se quiere ejecutar cambios, ni cuando
la tarea es revision de diseño o auditoria. Aqui se serializa estado y se
detiene.

## Qué captura

El skill captura cuatro bloques de informacion:

1. **Tarea actual** — el objetivo de alto nivel o feature en curso, con una
   frase concisa del estado de progreso.
2. **Archivos abiertos / modificados** — rutas relativas desde la raiz del
   repo, derivadas de `git status --short` (staged y unstaged). No se
   inventan rutas; si no hay cambios, la lista queda vacia.
3. **Decisiones tomadas** — elecciones de arquitectura, trade-offs,
   enfoques seleccionados y por qué. Se registran como viñetas, no como
   prosa narrativa.
4. **Pasos pendientes** — siguientes pasos concretos, en orden de prioridad.
   Lo que falta para cerrar la unidad logica en curso.

Opcionalmente una seccion de **Notas** — gotchas, items bloqueados,
preguntas abiertas, cosas que se intentaron y no funcionaron. Solo si hay
contenido real; no se genera seccion vacia.

## Cómo serializa el contexto

1. **Reunir estado.** Leer el estado de trabajo actual: rama, status,
   diff stat, log reciente. Solo lectura — no se muta el arbol.

2. **Resumir contexto.** Usar el estado reunido mas el historial de
   conversacion para producir un resumen cubriendo los cuatro bloques. Si
   el operador paso un titulo, se usa ese; si no, se infiere un titulo
   conciso de 3-6 palabras del trabajo en curso.

3. **Escribir el archivo de contexto.** El archivo es markdown con
   frontmatter: `status` (in-progress/completed), `branch` (rama actual,
   obligatorio para cross-branch restore), `timestamp` (ISO-8601),
   `session_duration_s` (omitir si no se puede determinar), y
   `files_modified` (lista de rutas relativas). Luego el cuerpo con el
   titulo, resumen, decisiones, pasos pendientes y notas.

## Dónde lo guarda

El archivo se escribe en el directorio de checkpoints del proyecto activo,
con un nombre timestamp + slug del titulo. Los archivos son append-only:
nunca se sobreescribe ni se borra un archivo existente. Cada guardado crea
un archivo nuevo. La colision de mismo segundo y mismo titulo se resuelve
con un sufijo corto.

La ruta exacta la calcula el skill en bash (no en el prompt) para que
titulos suministrados por el operador no inyecten metacaracteres en
comandos subsecuentes. El saneamiento es allowlist: solo sobreviven
`a-z 0-9 - .`.

## Cómo se restaura

La restauracion es un skill separado (context-restore). Este skill solo
guarda. Al terminar, confirma al operador el titulo, rama, ruta del
archivo, cantidad de archivos modificados y duracion, y sugiere usar
context-restore para reanudar despues.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git commits, pushes, ni merges. Toda operacion git queda
  detras de confirmacion explicita del operador.
- NO ejecuta tests, builds ni comandos de CLI externos. La orientacion es
  serializacion de estado en prosa local.
- NO abre conexiones de red. No publica. No despliega.
- NO invoca tooling de vendor (sesiones, analytics, telemetria, binarios
  gstack). Esos artefactos del referenciador se descartaron en la adaptacion.
- NO genera commits WIP automaticos ni modifica el arbol de trabajo.
- NO sobreescribe ni borra archivos de contexto existentes (append-only).
- Si el estado no puede reunirse por falta de contexto (no hay repo, no
  hay rama, no hay historial), se marca `coverage_gap` y se detiene — no se
  infiere ni se sustituye con una pulida conjetura.

El unico entregable es el archivo de contexto serializado, revisable por
el operador.

## Validacion

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/context-save/scripts/check-skill.mjs` verifica
  presencia de tokens de gobernabilidad, ausencia de APIs prohibidas y
  completitud del fixture negativo.
- Si no hay contexto que guardar (no hay tarea en curso, no hay repo), se
  emite `coverage_gap` en lugar de fabricar un contexto generico.

Derivada de context-save (garrytan/gstack, MIT).
