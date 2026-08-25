# Crear contenido y multimedia con Frames

Frames ayuda a pasar de “tengo una idea o una fuente” a “tengo un brief, una ruta creativa y entregables revisables”. El proceso se adapta: una pieza sencilla no necesita cargar la misma planificación que una campaña.

## Qué puedes crear

- Carruseles, historias y series de contenido.
- Piezas gráficas e imágenes con prompts y variantes gobernadas.
- Miniclips, videos explicativos y piezas sin rostro cuando el generador correspondiente esté disponible.
- Presentaciones ejecutivas como narrativa, slide map, mensajes y dirección visual.
- Campañas con charter, cronograma, parrilla, hitos y medición.
- Adaptaciones por canal, derivados y versiones localizadas.
- Revisión o edición de una pieza existente.

“Crear” puede significar producir un archivo final o preparar una especificación de alta calidad. Frames muestra cuál de las dos está acreditada para el formato solicitado.

## Cómo se convierte una idea en una pieza

1. **Sistema (P00):** resuelve identidad, voz, canales y reglas visuales cuando faltan.
2. **Materiales (P01):** inventaría fuentes, derechos y gaps.
3. **Investigación (P02):** separa evidencia, claims, supuestos y límites.
4. **Brief (P03):** define el resultado y obtiene aprobación.
5. **Plan (P04):** organiza campaña, calendario o múltiples entregables cuando aplica.
6. **Diseño (P05):** decide medio, narrativa, continuidad, activos y prompts.
7. **Activos (P06):** produce o captura materiales con procedencia.
8. **Revisión (P07):** evalúa contenido, marca, evidencia, derechos y accesibilidad.
9. **Edición (P08):** corrige y crea una versión sucesora.
10. **Distribución (P09):** prepara el paquete y se detiene ante autorización humana.

El sistema de selección activa solo las etapas necesarias. P03, P05, P07 y P08 suelen formar el recorrido mínimo de una pieza nueva.

## Entregables por necesidad

### Campaña

- Documento rector de campaña: propósito, audiencia, propuesta y límites.
- Production plan y cronograma: hitos, dependencias y capacidad.
- Content grid o parrilla: tema, canal, formato, fecha y objetivo.
- Dashboard specification: qué medir, de dónde viene el dato y quién lo interpreta. No implica un dashboard conectado si no existe adapter autorizado.

### Presentación ejecutiva

- Acuerdo ejecutivo y decisión que debe facilitar.
- Historia ejecutiva: conclusión primero y evidencia después.
- Mapa de diapositivas: función, mensaje y apoyo visual de cada una.
- Speaker notes, objeciones y llamada a la acción.
- Design profile y criterios de legibilidad.

### Carrusel, historia o gráfica

- Idea rectora y progresión por pantalla.
- Copy, titulares, alt text y cierre.
- Conjunto de instrucciones para crear imágenes o fondos.
- Asset map, continuity notes y variantes.
- Review report y lista de cambios.

### Imagen o miniclip

- Instrucción principal, exclusiones, variables y referencias permitidas.
- Duración, encuadre, ritmo, continuidad y safe areas.
- Procedencia, derechos, hashes y limitaciones.

### Video para explicar un método

La ruta `method-explainer` disponible prepara y valida:

- intención, audiencia, supuestos y afirmaciones permitidas;
- etapas o lentes, relaciones y presupuesto de tiempo por beat;
- funciones complementarias para voz, texto en pantalla y captions;
- contrato de diagrama con nodos, conectores, orden de entrada y poses de prueba;
- manifiesto de build y hashes para detectar cambios en los materiales.

`DiagramStage` permite comprobar el diagrama con fixtures sintéticos y guards de geometría. Esto
no equivale a un video terminado. El render local es asistido y solo puede continuar cuando una
composición, el audio y todos los materiales autorizados están disponibles; el adapter actual no
los genera ni concede autoridad de render.

La producción automática end-to-end, la generación o reconocimiento material de voz, la skill
candidata de diseño de diagramas y la publicación no están habilitados. Si otro proceso autorizado
materializa un MP4 local, permanece en `RENDERED_DRAFT` hasta completar revisión humana, derechos y
los gates independientes de preparación y publicación.

## Diseños “wow” con propósito

Frames usa el Design System de MetodologIA por defecto para HTML. “Wow” no significa añadir efectos a todo: significa jerarquía clara, narrativa memorable, evidencia visible, accesibilidad y una presentación adecuada al contexto. El HTML es offline, responsive, imprimible y coherente con el Markdown canónico.

## Límites y aprobaciones

- El brief debe aprobarse antes de producción, salvo autorización end-to-end inequívoca ya registrada.
- Un prompt no cuenta como imagen o video producido.
- Un render técnico no concede `READY` ni `PUBLISHED`.
- `RENDERED_DRAFT`, `HUMAN_APPROVED`, `READY` y `PUBLISHED` son estados distintos; ninguno implica el siguiente.
- Derechos desconocidos, claims sin fuente o marca no autorizada bloquean promoción.
- P09 prepara distribución, pero no publica.
- La disponibilidad de PPTX, video, audio o PDF depende de un generador material y verificado.

Si el formato final no está disponible, el trabajo útil no se pierde: Frames entrega el brief, la narrativa, los assets y la especificación para continuar con una herramienta autorizada.
