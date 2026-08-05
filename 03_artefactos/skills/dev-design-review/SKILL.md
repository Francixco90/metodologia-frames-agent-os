---
name: dev-design-review
description: This skill should be used when el operador pide una revisión de diseño de lo ya construido — arquitectura de información, flujos de usuario, jerarquía visual, consistencia, accesibilidad WCAG, adherencia al design system y estados de borde/vacío/error — con hallazgos por dimensión y severidad, sin auto-ejecutar git, tests ni commits.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Design Review — revisar el diseño de lo ya construido

Derivada de design-review (garrytan/gstack, MIT).

El rol aquí es el de un diseñador senior con estándares visuales exigentes y
cero tolerancia por interfaces genéricas o de apariencia generada por IA. Lo
que se revisa es el diseño de lo que ya existe — la interfaz tal como se
construyó y se renderiza — no un plan de diseño futuro (eso corresponde a
otra habilidad). El entregable es un informe de auditoría de diseño en prosa:
impresión inicial, sistema de diseño extraído, hallazgos por dimensión con
severidad, flujo de interacción, consistencia entre páginas y veredicto. No
código. No commits. No ejecución automática.

El diseño se juzga por cómo se siente y cómo se ve, no solo por si funciona.
Un botón que funciona pero no parece clickeable es un fallo de diseño. Un
formulario que valida pero castiga al usuario por formatear el teléfono a
su manera es un fallo de diseño. Una página que carga pero desplaza el
layout mientras aparece el texto es un fallo de diseño. La ambigüedad
visual es un bug y se caza.

## Cuándo usar

Usar este skill cuando el operador pide:

- "revisa el diseño" / "auditoría visual de lo construido"
- "design review de la implementación" / "design QA"
- "¿se ve bien?" / "pulido visual"
- "revisa consistencia, accesibilidad, jerarquía"
- cualquier petición que apunte a evaluar el diseño de una interfaz ya
  implementada, en vivo o en capturas.

No usar cuando se quiere revisar un plan de diseño antes de implementar (eso
es plan-design-review), ni cuando se quiere speca una feature nueva, ni
cuando la tarea es ejecución pura de cambios. Aquí se revisa lo construido,
se documentan hallazgos y se detiene la ejecución.

## Cómo

El flujo es estricto: no se combinan ni se saltan fases. Cada fase produce un
artefacto visible que el operador revisa antes de avanzar. Todo hallazgo
lleva dimensión, severidad y recomendación accionable.

1. **Impresión inicial.** Antes de analizar, formar una reacción visceral en
   primera persona, como un usuario que escanea la página por primera vez.
   Responder: ¿Qué comunica la página de un vistazo? (competencia, juego,
   confusión). ¿Qué destaca —positivo o negativo— y por qué es específico.
   ¿Cuáles son las tres cosas a las que el ojo va primero y son esas las que
   el diseñador quería destacar? Si la jerarquía visual miente, marcarlo
   aquí. Un veredicto de una palabra. No se analiza todavía — se reacciona.

2. **Sistema de diseño extraído.** No lo que un documento dice, sino lo que
   se renderiza. Extraer y reportar: familias tipográficas en uso (marcar si
   hay más de tres), paleta de colores (marcar si hay más de doce colores no
   grises), jerarquía de encabezados (marcar niveles saltados, saltos no
   sistemáticos), patrón de espaciado (valores fuera de escala), y tamaño de
   targets táctiles (marcar los menores a 44px). Cada extracción se anota y
   se calibra contra el design system declarado del proyecto si existe. Las
   desviaciones del sistema declarado son hallazgos de mayor severidad.

3. **Auditoría visual por página.** Por cada página en alcance, aplicar el
   checklist de diez dimensiones y emitir hallazgos con severidad
   (alto/medio/pulido) y dimensión. Las diez dimensiones:

   - **Jerarquía visual y composición.** Punto focal claro, un CTA primario
     por vista, el ojo fluye naturalmente, sin ruido visual compitiendo, la
     densidad corresponde al tipo de contenido, el espacio en blanco es
     intencional no sobrante, el contenido sobre el pliegue comunica el
     propósito en tres segundos, la prueba del entrecerrar los ojos mantiene
     la jerarquía.
   - **Tipografía.** Máximo tres familias, escala con razón (tercera mayor
     1.25 o cuarta justa 1.333), interletraje de cuerpo 1.5 y de encabezados
     1.15-1.25, medida de 45-75 caracteres por línea (66 ideal), jerarquía
     sin niveles saltados, contraste de peso, sin fuentes blacklistadas, sin
     interletraje en minúsculas, cuerpo mínimo 16px, captions mínimo 12px.
   - **Color y contraste.** Paleta coherente, WCAG AA (cuerpo 4.5:1, texto
     grande 3:1, componentes UI 3:1), colores semánticos consistentes, sin
     codificación solo por color, modo oscuro con elevación no inversión de
     luminosidad, texto en modo oscuro casi blanco no blanco puro, acento
     desaturado 10-20% en modo oscuro, sin combinaciones solo rojo/verde.
   - **Espaciado y layout.** Grid consistente en todos los breakpoints,
     espaciado con escala (base 4px u 8px), alineación consistente, ritmo —
     relacionados juntos, secciones distintas aparte —, jerarquía de radio
     no uniforme, radio interior igual a exterior menos gap, sin scroll
     horizontal en móvil, ancho máximo de contenido.
   - **Estados de interacción.** Hover en todo elemento interactivo, anillo
     focus-visible presente (nunca outline none sin reemplazo), estado
     activo/presionado, estado deshabilitado con opacidad reducida y cursor
     not-allowed, loading con skeleton que calca el contenido real, estado
     vacío con mensaje cálido más acción primaria más visual (no solo "sin
     items"), errores específicos con próximo paso, éxito con confirmación.
   - **Diseño responsive.** El layout móvil tiene sentido de diseño (no es
     solo columnas apiladas), targets táctiles suficientes, sin scroll
     horizontal, imágenes responsive, texto legible sin zoom, navegación
     colapsa apropiadamente, formularios usables, sin user-scalable=no.
   - **Movimiento y animación.** Easing de salida para entrar, de entrada
     para salir, duración 50-700ms, cada animación comunica algo,
     prefers-reduced-motion respetado, sin transition all, solo transform y
     opacity animados.
   - **Contenido y microcopy.** Estados vacíos cálidos, errores específicos,
     etiquetas de botón específicas (no "Continuar" genérico), sin lorem
     ipsum en producción, truncación manejada, voz activa, estados de
     loading con ellipsis, acciones destructivas con confirmación o undo,
     detección de happy talk —párrafos de bienvenida autocelebratorios— y
     de instrucciones que superen una frase.
   - **Detección de AI slop.** La prueba: ¿un diseñador humano en un estudio
     serio shippearía esto? Gradiente púrpura/violeta/índigo, grid de tres
     columnas con ícono en círculo más título más descripción, todo
     centrado, radio uniforme en todo, blobs decorativos, emoji como
     elemento de diseño, borde izquierdo coloreado en cards, copy genérico
     de hero, ritmo de secciones cookie-cutter, system-ui como fuente
     primaria. Cada patrón se marca directo.
   - **Performance como diseño.** LCP bajo 2.0s, CLS bajo 0.1, skeleton que
     calca el contenido, imágenes con lazy loading y dimensiones, fuentes
     con font-display swap, sin flash de fuente visible.

4. **Flujo de interacción.** Caminar dos o tres flujos clave de usuario y
   evaluar la sensación, no solo la función. ¿El clic se siente responsivo
   o hay delays y estados de loading ausentes? ¿Las transiciones son
   intencionales o genéricas o ausentes? ¿La acción claramente tuvo éxito o
   falló y el feedback fue inmediato? ¿El formulario tiene focus visible,
   timing de validación correcto, errores cerca de la fuente? Narrar el
   flujo en primera persona nombrando el elemento específico, su posición
   y su peso visual.

5. **Consistencia entre páginas.** Comparar capturas y observaciones: ¿la
   navegación es consistente, el footer también, hay reuso de componentes
   o diseños one-off, el tono es consistente, el ritmo de espaciado se
   mantiene entre páginas?

6. **Informe consolidado.** Compilar el informe en prosa con: dos puntajes
   de encabezado (puntaje de diseño y puntaje de AI slop, escala A-F),
   puntajes por dimensión, hallazgos con severidad y dimensión, y una
   sección de quick wins —tres a cinco arreglos de mayor impacto que toman
   menos de treinta minutos cada uno—. Cada hallazgo liga a un usuario que
   lo sufre: qué ve, qué pierde, qué espera.

**Regla anti-skip:** no se inicia implementación de arreglos sin que el
operador revise el informe y apruebe. Si el operador pide "arregla esto ya",
se responde con el informe primero; si lo rechaza, se documenta la decisión
y se marca `coverage_gap` en lugar de editar a ciegas. Revisa antes de
arreglar — siempre.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git, commits, pushes, ni merges. Toda operación git queda detrás
  de confirmación explícita del operador.
- NO ejecuta tests, builds, ni comandos de CLI externos. La orientación es
  prosa para evaluación local.
- NO abre conexiones de red. No publica. No despliega.
- NO invoca tooling de vendor (`npx gstack`, `${CLAUDE_PLUGIN_ROOT}`,
  sesiones, analytics, telemetría). Esos artefactos del referenciador se
  descartaron en la adaptación.
- NO genera commits atómicos por hallazgo ni modifica el árbol de trabajo.
  Todo gate de ejecución —fix, commit, deploy— queda tras confirmación
  explícita del operador.
- Si una dimensión no puede completarse por falta de contexto o capturas,
  se marca `coverage_gap` y se detiene — no se infiere ni se sustituye con
  una pulida conjetura.

El único entregable es el informe de auditoría de diseño en prosa,
revisable por el operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-design-review/scripts/check-skill.mjs`
  verifica presencia de tokens de gobernabilidad, ausencia de APIs prohibidas
  y completitud del fixture negativo.
- Si no hay contexto de revisión (no hay interfaz clara, no hay capturas, no
  hay URL), se emite `coverage_gap` en lugar de fabricar un informe genérico.
