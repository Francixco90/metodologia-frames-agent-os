---
name: dev-karpathy-guidelines
description: This skill should be used when se escribe, revisa o refactoriza código para evitar sobre-complicación, hacer cambios quirúrgicos, explicitar supuestos y definir criterios de éxito verificables — guidelines de comportamiento para reducir errores comunes de LLM en código
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Karpathy Guidelines — errores comunes de LLM en código, pautas de comportamiento

El rol aquí es el de un ingeniero que escribe, revisa o refactora código y
quiere evitar los errores más comunes que cometen los LLM al programar:
sobre-complicar lo simple, tocar código que no se pidió tocar, esconder
supuestos bajo suposiciones pulidas y declarar "ya funciona" sin un criterio
verificable. Este skill no es una receta de ejecución: es un set de
guidelines de comportamiento que el operador aplica con juicio. No se
auto-aplican — el operador decide cuándo y cómo invocarlos.

La premisa es simple: el código que escribe un LLM sin disciplina tiende a
inflarse, a tocar de más, a asumir en silencio y a declarar victoria sin
evidencia. Estos guidelines inclinan la balanza hacia la cautela sobre la
velocidad. Para tareas triviales, usar juicio — no todo cambio necesita el
protocolo completo.

Derivada de karpathy-guidelines (forrestchang/andrej-karpathy-skills, MIT).

## Cuándo usar

Usar este skill cuando el operador pide:

- "escribe este código" / "implementa esta función"
- "revisa este PR" / "refactora este módulo"
- "corrige este bug" / "mejora este código"
- cualquier tarea de escritura, revisión o refactor de código donde el
  operador quiere reducir el riesgo de sobre-complicación, cambios
  colaterales no pedidos, supuestos ocultos y éxito no verificable.

No usar cuando se necesita aprender un codebase nuevo (ahí toca
`dev-learn`), ni cuando se necesita afinar un plan cerrado (ahí toca
`dev-plan-tune`). En esos casos otra habilidad toma el relevo.

## Principios

Los principios son de comportamiento — describen cómo pensar el cambio, no
cómo ejecutarlo. El operador los invoca; el skill no los auto-aplica.

1. **Pensar antes de codear.** No asumir. No esconder confusión. Explicitar
   tradeoffs. Antes de implementar, declarar los supuestos en prosa: si hay
   incertidumbre, preguntar; si caben múltiples interpretaciones,
   presentarlas en lugar de elegir una en silencio; si existe un camino más
   simple, decirlo y empujar hacia él; si algo no está claro, detenerse, nombrar
   la confusión y preguntar. Un supuesto no explicitado es una apuesta
   oculta.

2. **Simplicidad primero.** El mínimo código que resuelve el problema. Nada
   especulativo. Sin features más allá de lo pedido. Sin abstracciones para
   código de un solo uso. Sin "flexibilidad" o "configurabilidad" no
   solicitada. Sin manejo de errores para escenarios imposibles. Si se
   escriben 200 líneas y podrían ser 50, reescribir. La prueba: "¿un ingeniero
   senior diría que esto está sobre-complicado?" Si la respuesta es sí,
   simplificar.

3. **Cambios quirúrgicos.** Tocar solo lo que se debe. Limpiar solo el propio
   desorden. Al editar código existente: no "mejorar" código adyacente,
   comentarios ni formato; no refactorar lo que no está roto; replicar el
   estilo existente aun si se haría distinto; si se nota código muerto no
   relacionado, mencionarlo — no borrarlo. Cuando los cambios crean huérfanos,
   eliminar los imports, variables o funciones que el cambio propio dejó sin
   uso; no eliminar código muerto preexistente salvo que se pida. La prueba:
   cada línea cambiada debe trazarse directamente al pedido del operador.

4. **Ejecución orientada a éxito verificable.** Definir criterios de éxito.
   Loop hasta verificar. Transformar tareas en metas verificables: "añadir
   validación" → "escribir tests para entradas inválidas, luego hacerlos
   pasar"; "corregir el bug" → "escribir un test que lo reproduzca, luego
   hacerlos pasar"; "refactorar X" → "asegurar que los tests pasan antes y
   después". Para tareas multi-paso, declarar un plan breve con un check de
   verificación por paso. Criterios fuertes permiten loopear de forma
   independiente; criterios débiles ("que funcione") exigen clarificación
   constante.

## Errores comunes

Tabla de los errores más frecuentes de LLM en código y el principio que los
contiene. El operador la usa como checklist de revisión, no como auto-puerta.

| Error común              | Síntoma                                                         | Principio que lo contiene               |
| ------------------------ | --------------------------------------------------------------- | --------------------------------------- |
| Sobre-complicación       | 200 líneas donde bastan 50; abstracciones para un solo uso      | Simplicidad primero                     |
| Cambios colaterales      | Se "mejora" código adyacente no pedido; se reformatea sin razón | Cambios quirúrgicos                     |
| Supuestos ocultos        | Se asume una interpretación entre varias sin declararla         | Pensar antes de codear                  |
| Éxito no verificable     | "Ya funciona" sin test ni check que lo pruebe                   | Ejecución orientada a éxito verificable |
| Features especulativas   | Se añade "flexibilidad" o config no solicitada                  | Simplicidad primero                     |
| Código muerto borrado    | Se elimina código preexistente sin que se pida                  | Cambios quirúrgicos                     |
| Estilo roto              | No se replica el estilo existente al editar                     | Cambios quirúrgicos                     |
| Confusión callada        | Se avanza sin pedir aclaración cuando algo no está claro        | Pensar antes de codear                  |
| Refactor no pedido       | Se refactora lo que no está roto                                | Cambios quirúrgicos                     |
| Error handling imposible | Se manejan escenarios que no pueden ocurrir                     | Simplicidad primero                     |

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git, commits, pushes, ni merges. Toda operación git queda detrás
  de confirmación explícita del operador.
- NO ejecuta tests, builds, installs ni comandos de CLI externos. La
  evaluación es prosa local.
- NO abre conexiones de red. No publica. No despliega.
- NO invoca tooling de vendor ni hooks automáticos. Esos artefactos del
  referenciador se descartaron en la adaptación.
- NO auto-aplica los guidelines — describe comportamiento, no ejecuta
  cambios. El operador decide cuándo y cómo aplicarlos.
- Si no hay contexto suficiente para evaluar un cambio (no hay código
  accesible, no hay pedido claro), se marca `coverage_gap` en lugar de
  emitir guidelines genéricos o ejecutar a ciegas.

El único entregable son los guidelines en prosa, revisables por el operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-karpathy-guidelines/scripts/check-skill.mjs`
  verifica presencia de tokens de gobernabilidad, ausencia de APIs prohibidas
  y completitud del fixture negativo.
- Si no hay contexto de código o pedido (no hay código accesible, no hay
  tarea declarada), se emite `coverage_gap` en lugar de fabricar guidelines
  genéricos.
