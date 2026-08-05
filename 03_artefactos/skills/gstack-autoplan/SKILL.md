---
name: gstack-autoplan
description: This skill should be used when orchestrating a multi-lens plan review pipeline (CEO, design, engineering, and developer experience perspectives) with automatic sequential execution and decision gating, or when needing to run all review lenses over a plan in one pass.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# gstack-autoplan — Orquestador de revisión multi-lente de planes

## Cuándo invocar esta skill

Invócala cuando un plan (documento de planificación, propuesta técnica, RFC o
spec de feature) deba pasar por varias lentes de revisión en una sola pasada y
se quiera reducir la fricción de los puntos de decisión intermedios. La skill
orquesta la ejecución secuencial de cuatro lentes de revisión —estratégica
(CEO), diseño, ingeniería y experiencia de desarrollador (DX)— y aplica un
conjunto de principios de decisión para resolver automáticamente las preguntas
mecánicas, dejando solo las decisiones de gusto y los desafíos al usuario para
una puerta de aprobación final.

Es la pieza opuesta a revisar cada lente manualmente: en lugar de 15-30
preguntas intermedias, una sola puerta final consolida los juicios que
requieren criterio humano.

## Principio de la capability

La capability no ejecuta código, no invoca herramientas externas y no muta el
repositorio. Es una skill de **evaluación local**: lee el plan y produce un
informe estructurado con las decisiones automatizadas, las decisiones de gusto
a surfear y los desafíos al usuario. La salida es prosa auditable; la
ejecución de las lentes de revisión subyacentes requiere confirmación
explícita del usuario antes de arrancar.

### Las 6 principios de decisión

Estos principios guían las decisiones automáticas en cada lente. Se aplican
con precedencia context-dependiente (la lente estratégica prioriza completitud;
la lente de ingeniería prioriza explicitud; la lente de diseño prioriza
explicitud + completitud):

1. **Completitud** — preferir el enfoque que cubre más casos límite.
2. **Radio de impacto** — abordar todo lo que el plan toca + importadores
   directos, sin expandir el alcance fuera de ese radio.
3. **Pragmatismo** — ante dos opciones que resuelven lo mismo, elegir la más
   limpia en segundos, no en minutos.
4. **No duplicar** — rechazar lo que ya existe; reutilizar.
5. **Explícito sobre clever** — un fix obvio de 10 líneas sobre una abstracción
   de 200; legible en 30 segundos por un contribuidor nuevo.
6. **Sesgo a la acción** — avanzar > ciclos de revisión > deliberación
   estancada. Marcar inquietudes sin bloquear.

## Clasificación de decisiones

Cada decisión automática se clasifica en una de tres categorías:

- **Mecánica** — una respuesta claramente correcta. Se decide y se registra en
  silencio.
- **Gusto** — dos opciones razonables con tradeoffs distintos. Se decide con
  recomendación y se surfacea en la puerta final.
- **Desafío al usuario** — cuando las lentes de revisión acuerdan que la
  dirección declarada por el usuario debería cambiar (merge, split, agregar,
  quitar). **Nunca** se decide automáticamente. Se surfacea con el contexto
  completo: lo que dijo el usuario, lo que recomiendan las lentes, por qué, y
  el costo si el usuario tenía razón.

## Ejecución secuencial — obligatoria

Las lentes se ejecutan en orden estricto: estrategia → diseño → ingeniería →
DX. Cada lente se completa antes de iniciar la siguiente, porque cada una se
apoya en los hallazgos de la anterior. Entre lentes se emite un resumen de
transición y se verifican los outputs requeridos de la lente previa.

El alcance de diseño y DX es condicional: se detecta a partir del contenido
del plan (términos de UI/UX para diseño; términos de API/CLI/SDK para DX). Si
no se detecta alcance, la lente se omite con justificación registrada.

## Qué significa "auto-decidir"

Auto-decidir reemplaza el **juicio** del usuario con los 6 principios. No
reemplaza el **análisis**: cada sección de cada lente se ejecuta a profundidad
plena —se lee el código referenciado, se producen los artefactos que la sección
exige, se identifican todos los issues que está diseñada para atrapar— y solo
la decisión de cada issue se automatiza con los principios. "Sin hallazgos" es
un output válido, pero solo después del análisis.

## Límite de fail-closed

La skill **no arranca ninguna lente de revisión sin confirmación explícita
del usuario**. La orquestación describe el plan de ejecución (lentes
detectadas, alcance, orden) y pide confirmación antes de proceder. Si el
usuario no confirma, no hay ejecución. Si una lente requiere invocar otra skill
de revisión, esa invocación también se surfacea antes de ejecutarse.

No hay ejecución automática de herramientas, no hay mutación del repositorio,
no hay publicación. La salida es un informe de evaluación.

## Output

Un informe consolidado con:

- Resumen del plan.
- Decisiones automatizadas (conteo + audit trail).
- Decisiones de gusto a surfear en la puerta final.
- Desafíos al usuario (si los hay), con contexto completo.
- Resumen por lente (score, hallazgos clave, consenso).
- Temas cross-lente (inquietudes que aparecieron en 2+ lentes
  independientemente).
- Ítems diferidos.
- Puerta de aprobación final con opciones: aprobar, aprobar con overrides,
  interrogar, revisar, rechazar.

Derivada de autoplan (garrytan/gstack, MIT).
