---
name: context-memory
description: This skill should be used when the user wants to persist, retrieve, or manage long-term memory and context across sessions so that work survives restarts, handoffs, and context window resets.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Context Memory — persistir y recuperar memoria y contexto entre sesiones

Derivada de `memory` (DN-OpenSource/claude-skills, Apache-2.0). Adaptacion clean-room al contexto MetodologIA: el homologo describe como persistir, recuperar y gestionar memoria duradera y contexto de trabajo entre sesiones, handoffs y reseteos de ventana de contexto. No publica; n8n dry-run. Solo evaluacion local y direccion de trabajo dentro del marco fail-closed del repositorio.

Esta skill es una herramienta fail-closed: describe QUE memoria persistir, COMO almacenarla (append-only, hash-bound), CUANDO recuperarla, y gatilla escritura solo cuando el usuario confirma explicitamente. Una ausencia de confirmacion no se sustituye por una persistencia automatica pulida.

## Cuando usar

- El usuario quiere persistir decisiones, hechos, tareas o hashes para que sobrevivan un reinicio, handoff o reseteo de ventana de contexto.
- El usuario quiere recuperar memoria duradera al iniciar una sesion nueva o continuar trabajo previo.
- El usuario quiere actualizar, olvidar o depurar memoria existente (entrada stale, referencia rota, hecho desactualizado).
- El usuario pide bootstrap de memoria de contexto para un proyecto o repo nuevo.
- El usuario pregunta que hay en memoria o que sabe el agente sobre un tema previamente trabajado.
- Tras un cambio que altera el proposito de un modulo, la superficie publica o las convenciones de un proyecto.

La regla operativa es errar hacia usarla: undertriggering es el modo de fallo mayor. Si dudan, persistan.

## Que almacenar

Memoria de contexto debe capturar lo que un futuro lector necesitaria saber para retomar el trabajo sin reconstruirlo desde cero.

| Categoria    | Ejemplos                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------- |
| Decisiones   | eleccion de patron, eleccion de libreria, trade-off resuelto, razon de no usar X         |
| Hechos       | arquitectura vigente, convenciones de codigo, entry points, dependencias entre modulos   |
| Tareas       | objetivo, responsable, write-set, gate del DAG, estado, proximo paso                     |
| Hashes       | `raw_sha256` de fuentes, receipt hash-bound, hashes de build, fingerprints de artefactos |
| Preferencias | rol del usuario, estilo de comunicacion, herramientas preferidas, estilo de codigo       |
| Gotchas      | convencion no obvia, edge case, razon historica de algo que esta como esta               |

No persistir: secretos, API keys, contrasenas, PII, direcciones completas, IDs gubernamentales, numeros de cuenta financiera. Nunca. [CONFIG]

## Formato de almacenamiento

La memoria de contexto es **append-only y hash-bound**.

- **Append-only**: cada entrada se anade al final del archivo de memoria; no se sobreescribe historial previo. Las correcciones se anaden como nuevas entradas con referencia a la entrada que corrigen, no reescribiendo el pasado.
- **Hash-bound**: cada entrada sustantiva lleva un hash de evidencia (sha256 del contenido fuente, receipt hash-bound, o hash del build que la produjo). Un claim sin hash no esta completo. [CONFIG]
- **Estructura**: archivos markdown con secciones por categoria (decisiones, hechos, tareas, preferencias, gotchas). Una entrada tipica: timestamp opcional, categoria, claim, fuente, hash, limite.
- **Cadena de evidencia**: claim -> fuente -> evidencia -> limite -> revision. Un claim sin limite no esta completo. Un claim sin fuente no puede marcarse `[DOC]`. [CONFIG]

Ejemplo de entrada:

```markdown
## Decision

- Claim: se uso RS256 para JWTs en `src/auth/login.ts`.
- Fuente: `src/auth/login.ts:42`. [CODIGO]
- Evidencia: raw_sha256 `a1b2c3...` del archivo.
- Limite: valido para v1.x; revisar si se migra a v2.
```

## Recuperacion

1. Al iniciar sesion o continuar trabajo, leer el archivo de memoria relevante antes de actuar.
2. Aplicar la memoria silenciosamente — no recitarla de vuelta al usuario a menos que lo pida. Usar la informacion naturalmente como un colega lo haria, no como leyendo de un dossier.
3. Si la memoria parece stale (menciona archivos/simbolos que no existen, contradice el codigo), marcarlo al usuario y ofrecer actualizar antes de proceder.
4. Para memoria de codebase, cargar el archivo raiz y los archivos de cada carpeta que se va a tocar, mas los padres intermedios en la ruta — pueden cargar convenciones heredadas.

## Ciclo de vida

La memoria de contexto sigue un ciclo de tres operaciones.

1. **Bootstrap** (crear desde cero): cuando no existe archivo de memoria y el usuario quiere persistencia. Survey del proyecto, escribir archivo raiz con hechos concretos (archivos reales, comandos reales, convenciones observadas), escribir archivos por carpeta significativa. Verificar releyendo: linea vaga es smell — reemplazar con especificos o borrar.
2. **Read** (cargar antes de trabajar): al iniciar trabajo en un proyecto, antes de cambios a una carpeta, o cuando el usuario pregunta sobre algo previamente trabajado. Si no existe archivo de codebase, bootstrapear (ver abajo) a menos que aplique una condicion de skip.
3. **Update** (mantener sincronizado): tras un cambio no trivial, cuando el usuario pide actualizar, o cuando se detecta staleness durante una lectura. Edicion dirigida — no reescribir el archivo a menos que su estructura este genuinamente desactualizada. Si una carpeta se borro, borrar su archivo de memoria. Si se renombro, renombrar y actualizar referencias cruzadas.

Regla de decision de actualizacion: actualizar si el cambio afecta algo que un futuro lector necesitaria saber — proposito de un modulo, entry points clave, superficie de API publica, dependencias entre carpetas, convenciones, gotchas. No actualizar por ediciones internas rutinarias.

## Fail-closed

- **No auto-persistir sin confirmacion**: una mencion casual del usuario no es hecho durable. El umbral es "el usuario claramente quiere que esto persista", no "el usuario lo dijo una vez". Cuando duden, pregunten. [CONFIG]
- **No silenciar sobreescritura de archivos editados a mano**: si un archivo de memoria fue claramente editado a mano por el usuario y se esta por sobreescribir durante un re-bootstrap, pedir confirmacion primero. [CONFIG]
- **No fabricar contenido durante bootstrap**: leer el codigo/proyecto real antes de escribir sobre el. [CONFIG]
- **No recitar memoria de usuario sin que lo pidan**: usarla como usarian cualquier otra cosa que saben — naturalmente, no performativamente. [CONFIG]
- **No auto-bootstrapear en sitio equivocado**: no crear archivos de memoria en un directorio que no es un proyecto, o cuando el usuario dijo que no. [CONFIG]
- **Cero secretos**: nunca persistir passwords, API keys, secretos, PII ni nada cuya fuga del archivo importe. [CONFIG]
- **Memoria stale es peor que no memoria**: mantener actualizado o borrar. [CONFIG]

## Cobertura y gaps

- Si falta el archivo fuente requerido para una entrada, marcar `coverage_gap` explicito. No inferir contenido. [CONFIG]
- Si el usuario pide persistir algo pero no hay procedencia, derechos o autoridad verificables, bloquear la promocion y marcar `coverage_gap`. [CONFIG]
- Si el usuario pide recuperar memoria y no existe archivo, reportar "nada que leer aun" — no fabricar. [CONFIG]
- Si la memoria contradice el codigo observado, flag al usuario antes de actuar sobre la memoria stale. [CONFIG]

Derivada de memory (DN-OpenSource/claude-skills, Apache-2.0).
