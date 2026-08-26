# MetodologIA Brand Content Studio — guía de activos v1.0

Estado: `GOVERNED_DRAFT`
Perfil: `metodologia-brand-content-canon-v1`

## Autoridad y alcance

- El manifiesto `asset-review.yml` decide identidad, estado, derechos y usos de cada activo. [METODOLOGIA]
- El nombre de archivo no concede autoridad. La identidad se resuelve por hash de contenido; copias exactas no se importan más de una vez. [METODOLOGIA]
- Los locators locales son privados. NotebookLM OS conserva solo digests portables en archivos versionados. [METODOLOGIA]

## Familia MetodologIA

- La familia preferida para aprobación humana es vectorial: símbolo, lockup positivo y lockup reverso. Sigue en `READY_FOR_HUMAN_APPROVAL`; todavía no equivale a `APPROVED`. [METODOLOGIA]
- Los PNG del símbolo y del lockup positivo son proyecciones derivadas, no nuevos masters. [METODOLOGIA]
- El cuadrado raster anterior queda como referencia histórica y no debe aparecer en un entregable final. [METODOLOGIA]
- El gráfico azul anteriormente llamado companion es una ilustración editorial, no un logo. [INFERENCIA]

## Prístino

- El activo localizado representa un personaje o mascota. No debe presentarse como logo corporativo ni mezclarse con MetodologIA hasta que Javier confirme su papel de marca y sus derechos. [INFERENCIA]

## Retratos

- `AST-PORTRAIT-JAVIER-MONTANO` puede usarse en perfil de equipo, biografía de fundador, ficha de speaker y contenido editorial; cuenta con autorización documentada. [METODOLOGIA]
- Los retratos de Katherine Oquendo, Daniel Zuluaga y German Sepulveda permanecen en `REVIEW`. No pueden entrar en prompts, fuentes, Studio ni postproducción hasta registrar consentimiento y alcance de uso. [METODOLOGIA]
- Un inventario local prueba existencia, no consentimiento. [METODOLOGIA]

## Uso en NotebookLM y Studio

1. Usar esta guía como fuente de grounding para responder qué activo puede emplearse.
2. No pedir a Studio que redibuje, reinterprete o genere un logo.
3. Pedir un área de marca limpia y aplicar el SVG aprobado en postproducción.
4. Referenciar siempre `asset_id`; nunca seleccionar por parecido visual o nombre de archivo.
5. Usar únicamente retratos con estado `APPROVED` y un uso solicitado incluido en `allowed_uses`.
6. Si falta autoridad, derecho o alcance, responder `coverage_gap` y bloquear el activo.

## Accesibilidad y calidad

- Elegir lockup positivo o reverso según contraste; no añadir fondos, sombras o contornos al master.
- Mantener proporción y zona de seguridad; no deformar, recortar ni recolorear el logo.
- Todo retrato usado debe tener texto alternativo factual, breve y sin inferir edad, identidad sensible o estado emocional.
- La validación final debe comprobar legibilidad, contraste, recorte, derechos y correspondencia exacta del hash.

## Gate de salida

Antes de materializar el notebook, Javier debe aprobar o rechazar la familia vectorial candidata. Los activos en `REVIEW` continúan excluidos aun cuando `NLM_PLAN_APPROVED` permita crear el notebook. [METODOLOGIA]
