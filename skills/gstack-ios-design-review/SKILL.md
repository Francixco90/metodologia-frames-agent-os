---
name: gstack-ios-design-review
description: This skill should be used when running a visual design audit on a mobile or iOS application, checking spec compliance against design tokens, detecting visual regressions, or reviewing on-device visual fidelity.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# gstack-ios-design-review — Auditoría visual de una app iOS contra su spec

## Cuándo invocar esta skill

Invócala cuando una app móvil o iOS necesite una auditoría de diseño visual:
verificar fidelidad contra los design tokens y la especificación, detectar
regresiones visuales entre builds, o revisar coherencia tipográfica, de
espaciado, color, jerarquía y accesibilidad en pantallas reales. La skill
es el complemento de evaluación visual para cualquier flujo de design QA
móvil.

No es un runner de device ni un daemon de captura. Es una metodología de
auditoría: la skill estructura cómo se establece la línea base de spec, cómo
se capturan las pantallas que el usuario provee, cómo se comparan contra la
especificación, y cómo se reportan hallazgos accionables.

## Principio de la capability

La capability **no lanza simulators, no conecta a devices, no ejecuta
capturas automáticas**. Es evaluación local fail-closed: la skill describe el
método de auditoría y procesa las capturas que el usuario provee, pero la
captura misma requiere confirmación explícita del usuario por pantalla. Sin
confirmación, no hay captura ni auditoría.

Esto protege contra la clase de fallo más común en design QA móvil: correr
un script de screenshots sobre un device sin línea base de spec, obtener 40
PNGs sin contexto, y producir un reporte que puntúa contra criterios que
nadie acordó. La skill establece la línea base antes de tocar cualquier
captura.

## Dimensiones de auditoría

Por cada pantalla, la skill puntúa 0-10 y explica qué la llevaría a 10:

1. **Jerarquía tipográfica.** Display vs body vs caption consistentes con los
   design tokens. SF Pro en la escala de Dynamic Type correcta. Line-height
   acorde al font size. Sin body a 12pt.
2. **Ritmo de espaciado.** Grilla de 4pt u 8pt usada de forma consistente.
   Sin paddings mágicos de 17/23/31pt. Safe-area insets respetados.
3. **Jerarquía de color.** Acción primaria con el contraste más alto;
   secundaria muted; destructiva distinguible. Dark mode renderiza correcto.
   Ratios de contraste cumplen WCAG AA para body (4.5:1) y large text (3:1).
4. **Touch targets.** Todo elemento interactivo >= 44x44pt. Sin "tappable
   text" menor a 24pt.
5. **Estados loading, empty y error.** Presentes e intencionales cada uno.
   Sin pantallas en blanco durante async. Empty states indican qué hacer
   después.
6. **Accesibilidad.** VoiceOver labels en todo elemento interactivo. Dynamic
   Type cap en XXL no rompe layouts. Reduce Motion respetado. Paleta
   testeada para color-blindness (deuteranopia es la más común).
7. **Disciplina de animación.** No más de 2 animaciones simultáneas.
   Duración 200-300ms para feedback de UI. Spring damping correcto (sin
   bounces en flujos serios).
8. **Alineación con idioma iOS.** Usa componentes nativos (`NavigationStack`,
   `List`, `Form`, system sheets) donde corresponde. Sin navegación
   reinventada. Sin hamburger menus web-style en phone.
9. **Densidad de información.** Contenido por pantalla cabe sin scroll
   horizontal. Pantallas largas tienen anclas de sección. Listas usan
   patrones reales de iOS list (swipe-to-delete, contextual menus).
10. **AI-slop check.** Layouts stock genéricos, "lorem ipsum" dejado dentro,
    cargo-cult Material Design importado de Android, gradientes que huelen a
    AI-generated.

## Fase 1: Línea base de spec

1. Identificar el contrato de design tokens (typography scale, spacing grid,
   color tokens, safe-area rules). Si no existe, marcar `coverage_gap` y
   pedir al usuario que provea el spec antes de continuar.
2. Listar las pantallas en scope de la auditoría. El usuario provee la lista
   o la skill la infiere desde el árbol de views SwiftUI, pero la lista se
   confirma con el usuario antes de capturar.
3. Acordar el baseline visual de referencia: build + commit + fecha de las
   capturas que se consideran "correctas". Sin baseline, no hay regresión
   que medir.

## Fase 2: Captura

Por cada pantalla en scope, con confirmación explícita del usuario:

1. El usuario provee el screenshot de la pantalla (la skill no lanza el
   device). Si el usuario pide a la skill que ejecute captura, la skill
   requiere confirmación explícita puerta por puerta antes de cualquier
   invocación a un runner externo.
2. Registrar metadatos: pantalla, build, orientación, Dynamic Type setting,
   modo (light/dark), Reduce Motion on/off.
3. Si la captura viene sin metadatos, marcar `coverage_gap` y pedir al
   usuario que los adjunte.

## Fase 3: Comparar

1. Aplicar el rubro de 10 dimensiones a cada captura contra la línea base de
   spec.
2. Para regresiones: comparar captura actual contra el baseline acordado en
   la Fase 1. Diferencias tipográficas, de espaciado o de color se reportan
   como regression con el diff concreto.
3. Para accessibility: verificar contraste contra los tokens, no contra
   eye-balling. Si el token no expone el ratio, marcar `coverage_gap`.

## Fase 4: Reporte

Producir un reporte markdown con:

- Capturas inline (las que el usuario provee, referenciadas por path relativo).
- Score 0-10 por dimensión por pantalla, con la línea "qué la llevaría a 10".
- Para cada score < 7: el hallazgo, el fix de mayor leverage, y el tradeoff.
- Sección de regresiones contra baseline, si aplica.
- Lista de `coverage_gap` explícitos (screens sin spec, tokens faltantes,
  metadatos no proveídos).

El reporte es `RENDERED_DRAFT`. No es `HUMAN_APPROVED`, no es `READY`, no es
`PUBLISHED`. El humano aprueba.

## Fail-closed

Sin línea base de spec, sin lista de pantallas confirmada, y sin
confirmación explícita del usuario por captura, la skill no audita. Una
ausencia no se sustituye por una inferencia pulida. Si la captura no tiene
metadatos o el spec no cubre una dimensión, se marca `coverage_gap` y se
escala al usuario antes de proseguir.

La skill no lanza simulators, no conecta a devices, no invoca daemons de
captura automáticamente. Eso es decisión del usuario, no de la skill.

Derivada de ios-design-review (garrytan/gstack, MIT).
