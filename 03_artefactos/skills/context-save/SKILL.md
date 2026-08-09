---
name: context-save
description: This skill should be used when the user wants to save current task context, working state, decisions, or pending work before switching tasks, closing a session, or handing off.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Context Save

Serializa el estado verificable de una tarea para que otra sesión pueda reanudarla sin
adivinar. Es una fotografía de continuidad, no una copia de la conversación ni una
operación Git. Derivada de context-save (garrytan/gstack, MIT) mediante adaptación
clean-room.

## Activación

Usar ante “guarda contexto/progreso/estado”, cierre de sesión, cambio de tarea o handoff.
No usar para restaurar, publicar, commitear ni ejecutar trabajo pendiente. Si no existe
una tarea reconocible o una raíz de proyecto, devolver `coverage_gap`.

Antes de actuar, leer [context.md](context.md). La cabina privada solo se consulta después
del route lock y con autorización.

## Entradas mínimas

- objetivo y estado actual;
- raíz y rama observadas, si existe Git;
- archivos cambiados obtenidos del estado real;
- decisiones durables y pasos pendientes;
- bloqueos, evidencia y siguiente gate.

No convertir una mención casual en memoria durable. No persistir secretos, PII,
chain-of-thought, logs completos ni contenido de otros proyectos.

## Flujo determinista

1. Resolver raíz y política de escritura. El único write set es el directorio privado de
   checkpoints autorizado.
2. Leer mediante argv explícito la rama, estado corto, diff-stat y commits recientes. No
   interpolar texto del usuario en shell.
3. Normalizar cinco bloques: objetivo, progreso, archivos, decisiones y pendientes.
4. Marcar como `UNKNOWN` toda afirmación no respaldada por conversación o estado material.
5. Crear un nombre con timestamp suministrado por el runtime y slug allowlisted
   `a-z0-9.-`; una colisión genera successor, nunca overwrite.
6. Escribir de forma atómica y releer bytes. El receipt debe incluir ruta relativa y hash
   material; timestamp y duración quedan fuera del digest semántico.

## Contrato de salida

Markdown con frontmatter `status`, `branch`, `timestamp`, `files_modified` y, solo si se
conoce, `session_duration_s`. El cuerpo contiene `Objetivo`, `Estado`, `Decisiones`,
`Pendientes`, `Bloqueos` y `Siguiente gate`. Omitir secciones opcionales vacías.

El cierre informa ruta, hash, rama, número de archivos y próxima acción recomendada. Un
archivo declarado pero inexistente o no releído no cuenta como guardado.

## Gates y casos borde

- Árbol limpio: guardar igualmente si existe tarea y decisiones; lista de archivos vacía.
- Sin Git: permitir checkpoint de conversación solo si la raíz y autoridad son inequívocas.
- Cambio de rama durante captura: bloquear y repetir snapshot.
- Ruta fuera del state root, symlink o colisión: bloquear.
- Dos guardados equivalentes: conservar ambos como eventos, no deduplicar por mtime.

## Límites

Operación **fail-closed** y `local-evaluation`: sin red, vendor runtime, hooks, commits,
pushes, merges, builds, tests, borrado ni efectos externos. Solo el checkpoint autorizado
puede escribirse. Ante evidencia incompleta, preservar lo conocido, declarar
`coverage_gap` y detenerse.

## Validación

El checker local exige versión, lineage, fixtures, [context.md](context.md), ocho headings,
ausencia de APIs/rutas prohibidas y límites de tamaño. `pnpm verify:skills` valida el
paquete integrado; una declaración YAML no prueba ejecución.
