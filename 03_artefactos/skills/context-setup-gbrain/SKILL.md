---
name: context-setup-gbrain
description: This skill should be used when the user wants to initialize or configure a shared/global brain store for context synchronization across sessions, agents, or workspaces.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# context-setup-gbrain — inicializar el brain store global de contexto

Inicializa y configura un almacén de contexto compartido (el _global brain_)
que sincroniza estado entre sesiones, agentes y workspaces del operador. El
homólogo describe los pasos de bootstrap, dónde vive el store y qué
configuración exige — pero no ejecuta instalaciones, no toca la red, no
escribe fuera del write-set declarado. Toda acción con side effects (instalar
un CLI, crear una base de datos, registrar un MCP) queda tras confirmación
explícita del operador (fail-closed). [CONFIG]

## Cuándo configurar el global brain

Configúralo cuando el operador quiera uno de estos objetivos:

- Persistir contexto entre sesiones de modo que un agente nuevo pueda resumir
  sin reconstruir todo el árbol de decisiones desde cero.
- Compartir memoria entre varios agentes que trabajan en paralelo sobre el
  mismo repo o workspace.
- Sincronizar estado de tareas, decisiones y aprendizajes a través de
  worktrees o repos distintos que pertenecen al mismo programa.

No lo configures si el operador solo quiere una sesión efímera sin memoria
cross-sesión, o si el store ya está inicializado y no hay cambios de
configuración. Si falta contexto para decidir, marca `coverage_gap` en lugar
de adivinar. [CONFIG]

## Qué configuración exige

El global brain necesita tres decisiones del operador antes de bootstrap:

1. **Dónde vive el store** — backend local embebido (PGLite en el filesystem
   del operador) o backend remoto (Supabase u otra base gestionada). El homólogo
   no instala nada; presenta la elección y espera confirmación.
2. **Política de confianza por remoto** — qué remotes (origins git) pueden
   escribir al brain y cuáles quedan read-only o bloqueados. Se captura una
   política por remote, no un开关 global. [INFERENCIA]
3. **Registro MCP** — si el brain se expone como servidor MCP para que los
   agentes lo consuman vía tool calls. El registro queda tras confirmación
   explícita; el homólogo no lo activa automáticamente.

Cada decisión se documenta en prosa. Sin confirmación, no se persiste nada.

## Dónde vive el store

El store vive en el directorio home del operador bajo una carpeta dedicada
(`~/.gbrain` por convención), separada del repo y del workspace. El homólogo
no crea esa ruta — solo la declara. Los artefactos del store (base embebida,
config de trust policy, manifiesto MCP) no se commitean al repo activo; son
estado local del operador. [CONFIG]

## Cómo hacer bootstrap

El flujo de bootstrap, descrito pero no auto-ejecutado:

1. Confirmar con el operador que quiere inicializar el brain (gate
   `requires_user_confirmation`).
2. Declarar el backend elegido (local embebido o remoto gestionado).
3. Declarar la política de confianza por remote.
4. Declarar si se registra como MCP.
5. Emitir los comandos de instalación/init solo después de confirmación
   explícita; el operador los ejecuta, el homólogo no los corre por sí solo.

El homólogo es fail-closed: una ausencia (sin backend, sin política, sin
confirmación) no se sustituye por una inferencia pulida — se marca
`coverage_gap`. [CONFIG]

## Límites

- `RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED`. Un
  bootstrap descrito no concede ningún estado de aprobación. [CONFIG]
- Sin confirmación explícita del operador, ninguna instalación, registro MCP
  o escritura al store se ejecuta. [CONFIG]
- El store es estado local del operador; no se commitea al repo ni se publica.
  [CONFIG]
- Si falta contexto para describir un paso, marca `coverage_gap` en lugar de
  fabricar una descripción genérica. [CONFIG]

Derivada de setup-gbrain (garrytan/gstack, MIT).
