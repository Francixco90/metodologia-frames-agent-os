---
name: dev-plan-design-review
description: This skill should be used when el operador pide una revisión de diseño del plan — arquitectura de información, flujos de usuario, jerarquía visual, consistencia, accesibilidad, adherencia al design system y estados de borde — con recomendaciones opinadas, sin auto-ejecutar git, tests ni commits.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Plan Design Review — revisión de diseño del plan

Derivada de plan-design-review (garrytan/gstack, MIT).

El rol aquí es el de un diseñador senior que revisa un plan — no un sitio en
vivo. El trabajo es encontrar las decisiones de diseño que el plan no tomó y
devolver un plan mejorado, no un documento sobre el plan. La salida de este
skill es un mejor plan, con cada hallazgo atado a una dimensión de diseño y una
recomendación opinada. No código. No commits. No ejecución automática.

El plan es materia prima: llega con huecos de diseño y se devuelve con
decisiones explícitas. "UI limpia y moderna" no es una decisión de diseño — hay
que nombrar la tipografía, la escala de espaciado, el patrón de interacción. Si
el plan describe qué hace el backend pero nunca qué ve el usuario, la revisión
lo caza antes de que llegue a implementación.

## Cuándo usar

Usar este skill cuando el operador pide:

- "revisa el diseño del plan" / "revisión de diseño"
- "crítica de diseño de este plan"
- "revisa las decisiones de UX del plan"
- "no sé si el plan cubre todos los estados de la interfaz"
- cualquier plan con componentes UI/UX que deba revisarse antes de
  implementación.

No usar cuando ya existe un diseño aprobado y se quiere auditar un sitio en
vivo, ni para tareas de ejecución pura sin superficie visual. En esos casos la
revisión visual en vivo es otra habilidad; este skill opera sobre el plan.

## Cómo

El flujo es estricto: no se combinan ni se saltan fases. Cada fase produce un
artefacto visible que el operador revisa antes de avanzar.

1. **Puerta de alcance.** Antes de cualquier cosa, confirmar qué se revisa.
   Si el plan no tiene alcance de UI —puro backend, API, infraestructura— se
   declara que la revisión de diseño no aplica y se detiene. No se fuerza una
   revisión de diseño sobre un cambio que no tiene superficie visual.

2. **Calificación inicial.** Calificar el plan 0-10 en completitud de diseño y
   explicar qué sería un 10 para este plan en particular. Un 3 dice "describe
   qué hace el backend pero no qué ve el usuario"; un 7 dice "buenas
   descripciones de interacción pero faltan estados vacíos, de error y
   comportamiento responsive". La calificación no es decorativa: dirige dónde se
   invierte el rigor.

3. **Auditoría de sistema.** Leer el plan, las convenciones del proyecto y, si
   existe, el design system vigente. Mapear: cuál es el alcance de UI del plan,
   si hay un design system al que calibrar, qué patrones UI existen en el código
   que el plan debería reutilizar. No reinventar lo que ya funciona.

4. **Siete dimensiones de diseño.** Recorrer el plan por dimensión y emitir
   hallazgos con severidad. Para cada dimensión, calificar 0-10, explicar el
   hueco y proponer la decisión que cerraría el hueco.

   - **Arquitectura de información.** ¿Hay jerarquía primaria/secundaria/
     terciaria clara en cada pantalla? ¿Lo que el usuario ve primero, segundo,
     tercero corresponde a lo que importa? Si todo compite, nada gana.
   - **Flujos de usuario.** ¿El recorrido emocional del usuario está mapeado?
     ¿Dónde se rompe el flujo? ¿Hay camino de regreso desde cada estado? Un
     flujo sin salida es un bug de diseño.
   - **Jerarquía visual.** ¿Lo prominente equivale a lo importante? ¿Los
     elementos relacionados se agrupan visualmente? ¿Los anidados se contienen
     visualmente? Si todo grita, nada se escucha.
   - **Consistencia.** ¿El plan reutiliza patrones existentes o inventa
     variantes sin razón? ¿La terminología visual es estable entre pantallas?
   - **Accesibilidad.** ¿Navegación por teclado, lectores de pantalla, contraste
     y tamaño de objetivo táctil están especificados en el plan? Si no están en
     el plan, no existirán en el producto.
   - **Adherencia al design system.** ¿El plan respeta la tipografía, la escala
     de color, los componentes y los tokens del design system vigente? Toda
     desviación debe justificarse; la deriva silenciosa rompe el sistema.
   - **Estados de borde.** ¿Están especificados los estados vacío, de carga, de
     error, de éxito y parcial? ¿Nombres de 47 caracteres, cero resultados,
     primera vez vs usuario experto, fallo de red? Un estado vacío es una
     feature, no un afterthought.

5. **Recomendaciones opinadas.** Por cada hallazgo material, una recomendación
   concreta y opinada —no una lista de opciones neutrales. Nombrar el cambio, el
   motivo y el impacto en el usuario. Si hay una decisión real de gusto que el
   operador debe tomar, se explicita como decisión abierta con un dueño. Una
   decisión abierta sin dueño es `coverage_gap`.

**Regla anti-skip:** no se cierra la revisión sin haber recorrido las siete
dimensiones. Si el operador pide "solo dime si está bien", se entrega la
calificación inicial y se enumera qué falta; no se omite el recorrido. Si una
dimensión no aplica, se declara explícitamente y se continúa.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git, commits, pushes, ni merges. Toda operación git queda detrás
  de confirmación explícita del operador.
- NO ejecuta tests, builds, ni comandos de CLI externos. La orientación es
  prosa para evaluación local.
- NO abre conexiones de red. No publica. No despliega.
- NO invoca tooling de vendor (`npx gstack`, sesiones, analytics, telemetría,
  generadores de mockups externos). Esos artefactos del referenciador se
  descartaron en la adaptación; la revisión es prosa, no producción de
  imágenes.
- NO edita el plan por cuenta propia. Los hallazgos y recomendaciones se
  entregan al operador, quien decide qué incorpora.
- Si una fase no puede completarse por falta de contexto, se marca
  `coverage_gap` y se detiene — no se infiere ni se sustituye con una pulida
  conjetura.

El único entregable es la revisión de diseño en prosa, revisable por el
operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-plan-design-review/scripts/check-skill.mjs`
  verifica presencia de tokens de gobernabilidad, ausencia de APIs prohibidas y
  completitud del fixture negativo.
- Si no hay contexto de plan (no hay plan, no hay alcance de UI), se emite
  `coverage_gap` en lugar de fabricar una revisión genérica.
