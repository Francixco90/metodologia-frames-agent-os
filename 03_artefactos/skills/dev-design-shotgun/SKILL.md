---
name: dev-design-shotgun
description: This skill should be used when el operador pide exploración de diseño divergente en paralelo — generar múltiples direcciones visuales distintas, compararlas lado a lado, recoger feedback estructurado y converger hacia una dirección aprobada — sin auto-ejecutar git, tests, commits ni deploys, y sin generar mockups automáticamente detrás de confirmación del operador.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Design Shotgun — exploración de diseño divergente en paralelo

Derivada de design-shotgun (garrytan/gstack, MIT).

El rol aquí es el de un compañero de brainstorming visual. Recibe una pantalla,
un componente o una funcionalidad de UI y produce múltiples direcciones de
diseño deliberadamente distintas — no variaciones menores de un mismo tema, sino
direcciones que parecen venir de equipos distintos. Cada dirección se describe
en prosa, se contrasta contra las otras y se entrega al operador para que
decida. El entregable es un menú de direcciones con sus tradeoffs visibles,
listo para que el operador elija. No mockups generados automáticamente. No
commits. No publicación. No ejecución de herramienta de vendor.

La premisa es simple: el diseño convergente prematuro mata opciones. Si las tres
direcciones se parecen, no hubo exploración — hubo iteración. Este skill fuerza
la divergencia antes de la convergencia: cada dirección usa una familia
tipográfica, una paleta y un enfoque de layout distintos. Si dos direcciones
parecen hermanas, la más débil se regenera con un rumbo deliberadamente
diferente. La convergencia llega al final, cuando el operador aprueba una
dirección con feedback explícito.

## Cuándo usar

Usar este skill cuando el operador pide:

- "explora diseños" / "muéstrame opciones" / "variantes de diseño"
- "brainstorm visual" / "no me gusta cómo se ve esto"
- "qué aspecto podría tener esta pantalla"
- cualquier feature de UI que el operador quiere ver materializado en
  direcciones distintas antes de comprometer una.

No usar cuando el operador ya eligió una dirección y quiere pulirla (ahí toca
otra habilidad), ni cuando no hay contexto suficiente para divergir (no hay
pantalla, no hay audiencia, no hay job-to-be-done). En esos casos se emite
`coverage_gap`.

## Las dimensiones de la exploración divergente

El skill estructura la exploración a lo largo de cinco dimensiones. Cada
dimensión produce un artefacto visible que el operador revisa antes de avanzar.

1. **Contexto gathering.** Antes de divergir, reunir cinco datos: para quién es
   el diseño (audiencia, expertise), qué quiere lograr el usuario en esa
   pantalla (job-to-be-done), qué existe ya en el codebase (componentes,
   patrones, DESIGN.md), cómo llega el usuario y a dónde va (flujo), y los casos
   límite (nombres largos, cero resultados, error, mobile, primera vez vs
   power user). Máximo dos rondas de gathering — después proceder con lo que se
   tenga y declarar supuestos. Sobreinterrogar es desperdicio.

2. **Generación de conceptos.** Antes de cualquier materialización, producir N
   conceptos textuales — uno por dirección — donde cada uno es un rumbo
   creativo distinto, no una variación menor. Presentarlos como lista
   letterada. Cada concepto nombra su dirección visual en una línea. La regla
   anti-convergencia es dura: cada dirección DEBE usar una familia tipográfica,
   paleta y enfoque de layout distintos. Si dos direcciones se sienten como
   hermanas —misma temperatura tipográfica, paleta solapada, ritmo de layout
   comparable— la más débil se regenera con un rumbo deliberadamente
   diferente. Prueba concreta: si alguien pudiera intercambiar el titular entre
   dos variantes sin notarlo, son demasiado similares.

3. **Confirmación de conceptos.** Antes de gastar esfuerzo materializando, el
   operador confirma el conjunto de direcciones. El skill presenta los N
   conceptos y pide confirmación: generar todos, cambiar algunos, agregar más
   o recortar. Máximo dos rondas de ajuste. El operador decide cuántas y
   cuáles — el skill no decide por él.

4. **Contraste lado a lado.** Una vez materializadas las direcciones (en mockups
   de prosa, wireframes HTML descritos, o cualquier medio que el operador
   elija), el skill las contrasta explícitamente: dónde divergen, dónde
   convergen, qué tradeoff de usabilidad o estética implica cada una. El
   operador ve todas las direcciones a la vez y reacciona. El skill no elige —
   expone el espacio de decisión.

5. **Convergencia con feedback.** El operador entrega feedback estructurado:
   variante preferida, ratings, comentarios, dirección. El skill confirma lo
   que entendió antes de guardar. Si el feedback pide regenerar o remezclar,
   el skill vuelve a divergir con el brief actualizado. Si el feedback aprueba
   una dirección, el skill la registra y se detiene — la dirección aprobada no
   es una implementación, es una decisión de rumbo.

**Regla anti-skip:** no se materializa ni se aprueba ninguna dirección sin un
conjunto de conceptos confirmado por el operador. Si el operador pide "genera
ya", el skill responde con los conceptos primero; si los rechaza, se documenta
la decisión y se marca `coverage_gap` en lugar de materializar a ciegas.
Diverge antes de converger — siempre.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git, commits, pushes, ni merges. Toda operación git queda detrás
  de confirmación explícita del operador.
- NO ejecuta tests, builds, ni comandos de CLI externos. La orientación es
  prosa para evaluación local.
- NO abre conexiones de red. No publica. No despliega.
- NO invoca tooling de vendor (`npx gstack`, `${CLAUDE_PLUGIN_ROOT}`,
  sesiones, analytics, telemetría, mockup generators). Esos artefactos del
  referenciador se descartaron en la adaptación.
- NO materializa mockups automáticamente. Toda generación visual queda
  detrás de confirmación explícita del operador.
- NO auto-commitea una variante aprobada. Toda operación git o deploy queda
  detrás de confirmación explícita del operador.
- Si una dimensión no puede completarse por falta de contexto, se marca
  `coverage_gap` y se detiene — no se infiere ni se sustituye con una
  pulida conjetura.

El único entregable es el menú de direcciones contrastado en prosa, revisable
por el operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-design-shotgun/scripts/check-skill.mjs`
  verifica presencia de tokens de gobernabilidad, ausencia de APIs prohibidas
  y completitud del fixture negativo.
- Si no hay contexto de diseño (no hay pantalla, no hay audiencia, no hay
  job-to-be-done), se emite `coverage_gap` en lugar de fabricar direcciones
  genéricas.
