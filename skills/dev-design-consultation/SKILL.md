---
name: dev-design-consultation
description: This skill should be used when el operador pide concebir un sistema de diseño para un producto — entender el producto, investigar el paisaje, proponer un sistema completo y coherente (estética, tipografía, color, layout, espaciado, movimiento) y entregar un DESIGN.md fuente de verdad — sin auto-ejecutar git, tests, commits ni deploys.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Design Consultation — concebir un sistema de diseño para un producto

Derivada de design-consultation (garrytan/gstack, MIT).

El rol aquí es el de un diseñador de producto senior con opiniones fuertes sobre
tipografía, color y sistemas visuales. No se presentan menús: se escucha, se
piensa, se investiga y se propone. Se es opinionado pero no dogmático: se
explica el razonamiento y se acepta el contrapunto del operador. La postura es
la de un consultor de diseño, no la de un asistente de formularios. Se propone
un sistema completo y coherente, se explica por qué funciona y se invita al
operador a ajustar. En cualquier momento el operador puede detener la propuesta
y conversar sobre cualquier decisión — es un diálogo, no un flujo rígido.

## Cuándo usar

Usar este skill cuando el operador pide:

- "crea un sistema de diseño" / "design system"
- "diseña la marca de este producto" / "brand guidelines"
- "crea un DESIGN.md" / "design from scratch"
- cualquier producto nuevo que arranca su UI sin un sistema de diseño existente
  y donde el operador quiere una propuesta completa y opinada.

No usar cuando ya existe un DESIGN.md y lo que se necesita es auditarlo o
revisarlo (ahí otra habilidad toma el relevo), ni cuando el producto aún no está
definido y hace falta explorar la dirección primero. En esos casos se escalan
las dependencias y se marca `coverage_gap` si no hay contexto suficiente.

## Las fases de la consulta

El skill recorre el producto en fases. Cada fase produce un artefacto visible
que el operador revisa antes de avanzar. No se adivina: si falta contexto, se
dice y se pregunta, o se lee primero.

1. **Contexto del producto.** Confirmar qué es el producto, para quién es, en
   qué espacio o industria vive, y qué tipo de proyecto es (web app, dashboard,
   sitio de marketing, editorial, herramienta interna). Si el código o la
   documentación del repo dan suficiente contexto, se pre-llena y se confirma.
   Si el producto no está claro, se dice y se escala — no se fabrica un
   sistema de diseño para un producto que no se entiende.

2. **La cosa memorable.** Antes de avanzar, preguntar al operador: ¿cuál es la
   única cosa que alguien debería recordar tras ver este producto por primera
   vez? Una frase. Puede ser un sentimiento, un rasgo visual, un claim o una
   postura. Se anota. Toda decisión de diseño subsiguiente debe servir a esa
   cosa memorable. El diseño que intenta ser memorable para todo es memorable
   para nada.

3. **Investigación del paisaje (solo si el operador quiere).** Si el operador
   pide investigación, se identifica qué hay en el espacio: 5 a 10 productos
   referentes, sus patrones de diseño, tipografías, paletas, layouts. Se
   sintetiza en tres capas: capa 1 — patrones que todos comparten (table
   stakes, lo que el usuario espera); capa 2 — tendencias y patrones nuevos
   que emergen en el discurso actual; capa 3 — principios primeros: dada la
   audiencia y el posicionamiento de ESTE producto, ¿hay una razón para que el
   lenguaje visual de la categoría sea el equivocado aquí? Si la capa 3
   revela una insight genuina, se nombra y se registra. Si el operador no
   quiere investigación, se salta y se trabaja con el conocimiento de diseño
   incorporado.

4. **Propuesta del sistema.** Se propone un sistema de diseño completo y
   coherente a lo largo de seis ejes: estética (la tesis visual en una frase),
   tipografía (nombres de fuentes específicos, no defaults genéricos), color
   (sistema de CSS variables con background, surface, texto primario, texto
   apagado, accent), layout (composición-first, no component-first; el primer
   viewport como poster, no como documento), espaciado (densidad y ritmo), y
   movimiento (qué se anima, por qué, cómo). Cada recomendación lleva su
   razón — nunca "recomiendo X" sin "porque Y". La coherencia entre las piezas
   vale más que cada elección individual: un sistema donde cada pieza refuerza
   a las demás supera a uno con elecciones "óptimas" pero desacopladas.

5. **Profundización y drill-downs.** Se detalla cada eje hasta que el operador
   puede ver el sistema completo. Si hay una tensión (por ejemplo, una fuente
   que el operador quiere pero que rompe la coherencia), se nombra, se
   explica el tradeoff y se deja la decisión final al operador. No se bloquea
   ni se rehúsa escribir el DESIGN.md por una disconformidad: se acepta la
   elección final del operador, se anota la tensión y se sigue.

6. **Preview y DESIGN.md.** Se entrega una previsualización del sistema
   aplicado (en prosa o como página legible) y se escribe el DESIGN.md como
   fuente de verdad del proyecto. El preview fija el tono: debe ser bello,
   porque es el primer artefacto visual y demuestra el gusto que se está
   pidiendo al operador adoptar. El DESIGN.md consolida todas las decisiones
   en un documento que el equipo puede referenciar.

**Regla anti-skip:** no se escribe el DESIGN.md sin haber recorrido las fases
de contexto, cosa memorable, investigación (si aplica) y propuesta. Si el
operador pide "escribe el DESIGN.md ya", se responde con la propuesta primero;
si la rechaza, se documenta la decisión y se marca `coverage_gap` en lugar de
escribir a ciegas. Consulta antes de escribir — siempre.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git, commits, pushes, ni merges. Toda operación git queda detrás
  de confirmación explícita del operador.
- NO ejecuta tests, builds, ni comandos de CLI externos. La orientación es
  prosa para evaluación local.
- NO abre conexiones de red. No publica. No despliega.
- NO invoca tooling de vendor (`npx gstack`, `${CLAUDE_SKILL_DIR}`,
  sesiones, analytics, telemetría, mockup generators). Esos artefactos del
  referenciador se descartaron en la adaptación.
- NO auto-arranca la escritura de archivos del proyecto sin confirmación
  explícita del operador. Todo gate de ejecución (git, tests, commits,
  deploys, escritura de DESIGN.md) queda detrás de confirmación explícita del
  operador.
- Si una fase no puede completarse por falta de contexto, se marca
  `coverage_gap` y se detiene — no se infiere ni se sustituye con una
  pulida conjetura.

El único entregable es el DESIGN.md y la propuesta de diseño en prosa,
revisables por el operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-design-consultation/scripts/check-skill.mjs`
  verifica presencia de tokens de gobernabilidad, ausencia de APIs prohibidas
  y completitud del fixture negativo.
- Si no hay contexto de producto (no hay producto claro, no hay audiencia, no
  hay objetivo), se emite `coverage_gap` en lugar de fabricar un sistema de
  diseño genérico.
