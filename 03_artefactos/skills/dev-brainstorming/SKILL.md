---
name: dev-brainstorming
description: This skill should be used when el operador necesita convertir una idea suelta en un diseño o especificación estructurada — generar opciones en divergente sin juzgarlas, acotar en convergente con criterios, categorizar y entregar un diseño revisable — sin auto-ejecutar commits, deploys ni invocar skills de implementación.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Brainstorming — de idea suelta a diseño estructurado, método

El rol aquí es el de un compañero de diseño que toma una idea aún blanda — una
feature, un componente, un cambio de comportamiento, una utilidad — y la convierte
en un diseño o especificación revisable, paso a paso, en diálogo con el operador.
Brainstorming no es improvisar: es recorrer dos movimientos deliberados —
divergente (abrir opciones sin juzgarlas) y convergente (acotar con criterios) —
y entregar un artefacto que el operador aprueba antes de cualquier
implementación. Este skill recorre el proceso en fases y entrega el diseño en
prosa. No código. No commits. No ejecución automática.

La premisa es simple: una idea que no se explota se implementa mal. "Ya sé qué
hacer" no sirve — se generan opciones alternativas antes de elegir—; "lo
simple no necesita diseño" no sirve — los proyectos simples es donde las
suposiciones no examinadas causan más trabajo perdido—; "probemos esto" no
sirve — se presenta el diseño y se obtiene aprobación antes de avanzar. No se
adivina: si no se sabe algo, se pregunta, o se lee el contexto primero.

## Cuándo usar

Usar este skill cuando el operador pide:

- "brainstorm esta idea" / "ayúdame a pensar esto"
- "qué opciones veo para X" / "cómo encararías esto"
- "diseña esta feature antes de implementarla"
- "convierte esta idea en spec"
- cualquier idea suelta que el operador quiere explorar y estructurar antes de
  tocar código.

No usar cuando ya hay un plan cerrado que afilar (ahí toca `dev-plan-tune`), ni
cuando se necesita aprender un codebase nuevo (ahí toca `dev-learn`), ni cuando
se investiga un bug concreto (ahí toca `dev-investigate`). En esos casos otra
habilidad toma el relevo.

## Las fases del brainstorming

El skill recorre la idea en cinco fases. Cada fase produce un artefacto visible
que el operador revisa antes de avanzar.

1. **Explorar contexto.** Antes de proponer nada, entender el estado actual:
   leer archivos, docs y commits recientes del proyecto. Declarar qué se leyó y
   qué se omitió. Si el proyecto es demasiado grande para un solo diseño,
   descomponer en subproyectos: identificar piezas independientes, cómo se
   relacionan y en qué orden construirlos; luego brainstormer el primero por el
   flujo normal. Sin contexto, las opciones no aterrizan.

2. **Preguntar para entender.** Preguntar una pregunta a la vez, preferindo
   opción múltiple cuando sea posible, abierta cuando haga falta. El foco es
   entender: propósito, restricciones, criterios de éxito. No apilar preguntas:
   si un tema necesita más exploración, partirlo en varias. El operador confirma
   el alcance antes de generar opciones.

3. **Divergente: generar opciones.** Proponer dos o tres enfoques distintos con
   trade-offs, presentados en prosa, con la recomendación y el razonamiento al
   frente. En esta fase **no se juzgan las ideas**: el punto es abrir el espacio
   de opciones, no cerrarlo. Aplicar YAGNI sin piedad — retirar funcionalidad
   innecesaria de cada enfoque. Una fase divergente sin volumen de opciones es
   una decisión disfrazada de brainstorming.

4. **Convergente: acotar y categorizar.** Una vez entendido el problema y
   generadas las opciones, acotar con criterios explícitos: agrupar ideas por
   categoría, priorizar por impacto y costo, descartar las que no sobreviven los
   criterios. Presentar el diseño por secciones escaladas a su complejidad —
   unas frases si es directo, hasta un par de párrafos si es matizado—, pedir
   confirmación después de cada sección. Cubrir: arquitectura, componentes,
   flujo de datos, manejo de errores, pruebas. Si algo no cuadra, volver a
   divergente en ese punto.

5. **Presentar diseño y obtener aprobación.** Presentar el diseño consolidado y
   pedir aprobación explícita del operador. Sin aprobación, no se avanza a
   implementación. El diseño puede ser corto para proyectos simples, pero debe
   existir y debe aprobarse. La aprobación es el gate que separa "creo que esto
   es lo que quieres" de "sé que esto es lo que quieres".

**Regla anti-skip:** no se avanza a implementación sin diseño presentado y
aprobado por el operador. Si el operador pide "solo hazlo", se responde con el
diseño corto y se pide aprobación; no se salta a código sin diseño. Brainstorm
en orden — siempre.

## Errores comunes

- **Juzgar durante el divergente.** Si se descartan ideas mientras se generan,
  el espacio de opciones colapsa antes de abrirse. Anotar primero, evaluar
  después.
- **"Esto es muy simple para necesitar diseño".** Cada proyecto pasa por el
  proceso. Una lista de tareas, una utilidad de una sola función, un cambio de
  config — todos. Lo simple es donde las suposiciones no examinadas causan más
  desperdicio.
- **Confundir brainstorm con plan aprobado.** Un diseño presentado no es un
  plan aprobado. La confirmación explícita del operador es el gate que falta.
- **Proponer refactor no relacionado.** Donde el código existente tiene
  problemas que afectan el trabajo, incluir mejoras dirigidas como parte del
  diseño. No proponer refactor suelto. Mantener el foco en lo que sirve al
  objetivo actual.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git, commits, pushes, ni merges. Toda operación git queda detrás
  de confirmación explícita del operador.
- NO ejecuta tests, builds, installs ni comandos de CLI externos. El diseño es
  prosa para evaluación local.
- NO invoca skills de implementación (`writing-plans`, `frontend-design`,
  `mcp-builder` u otros). El siguiente paso, si lo hay, lo decide el operador.
- NO abre conexiones de red. No publica. No despliega.
- NO invoca tooling de vendor (companions visuales, sesiones, analytics,
  telemetría, hooks, mockup generators en navegador). Esos artefactos del
  referenciador se descartaron en la adaptación.
- NO auto-arranca installs, dependencias ni comandos con side effects. Todo
  gate de ejecución (git, tests, installs, deploys) queda detrás de
  confirmación explícita del operador.
- Si una fase no puede completarse por falta de contexto o de acceso al
  proyecto, se marca `coverage_gap` y se detiene — no se infiere ni se
  sustituye con una conjetura pulida.

El único entregable es el diseño en prosa, revisable y aprobable por el
operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-brainstorming/scripts/check-skill.mjs` verifica
  presencia de tokens de gobernabilidad, ausencia de APIs prohibidas y
  completitud del fixture negativo.
- Si no hay contexto de brainstorming (no hay idea declarada, no hay proyecto
  accesible), se emite `coverage_gap` en lugar de fabricar un diseño genérico.

## Lineage

Derivada de superpowers/brainstorming (obra/superpowers, MIT).
