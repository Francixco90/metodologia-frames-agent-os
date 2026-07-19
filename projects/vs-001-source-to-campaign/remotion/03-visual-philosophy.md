# 03 Visual philosophy — Cadena visible

## Dirección operativa

La pieza usa una cadena causal vertical y una señal persistente. Cada beat responde una de tres
preguntas: **¿De dónde sale?**, **¿Cómo se decide?** y **¿Hasta dónde llega?**. [DOC]

## Sistema verificable

- Lienzo: 1080×1920; 30 fps; safe zone de 96 px.
- Paleta: fondo `#090A0C`, texto `#F7F6F1`, señal `#D6FF4B`, bifurcación `#68E6E0`,
  límite `#FF8A70`. El contraste de texto principal contra fondo es mayor a 7:1. [CONFIG]
- Tipografía: Work Sans y JetBrains Mono vendorizadas con licencia OFL 1.1, archivo de licencia y
  SHA-256. `FontFace` + `delayRender` bloquean el frame hasta cargar las cuatro variantes; no
  hay font remota ni fallback de host. La equivalencia cross-host queda pendiente hasta una matriz
  con el mismo Chromium pinneado.
- Densidad: máximo un headline, un cuerpo, una evidencia secundaria y una señal causal por beat.
- Safe zone: ningún texto material entra en los 96 px exteriores; captions usan una banda inferior
  separada de badges y UI de plataforma.
- Jerarquía: pregunta 30–34 px, eyebrow 28 px, headline 68–88 px, cuerpo 36–42 px, caption 38 px.
- Estado redundante: `RENDERED_DRAFT` usa texto + rectángulo + patrón diagonal; `LOCAL TEST ONLY`
  usa texto + círculo + trama de puntos. El color nunca comunica estado por sí solo.

## Gramática de movimiento

- Entrada y salida: opacity + translateY de máximo 28 px, calculados solo con frames y clamps.
- Continuidad: la señal y los dos badges son persistentes; Web/Motion se bifurcan únicamente en
  `B05-bifurcacion`.
- Transiciones: solapamiento fijo de 12 frames ya restado en el
  total; no hay CSS animations, timers, reloj, red ni aleatoriedad.
- Quietud: cada caption conserva su hold completo después de la entrada.
- Reduced motion: elimina desplazamiento y escala; mantiene opacity acotada, layout, caption,
  texto, forma y patrón.

## Derechos, audio y assets

La implementación usa texto, primitives 2D first-party y cuatro archivos de font OFL
hash-bound. No importa imagen, video, SVG no confiable, música ni voz. El perfil es silent-first y
ffprobe debe mostrar solo stream de video. [CONFIG]

## Casos de QA

- Captions: monotónicos, sin overlap, dentro de beat y composición; WPM efectivo ≤
  143.47826086956522.
- Límites: revisar cada transición en pre/durante/post y probar `T-1/T/T+1`.
- Texto: fixtures vacía, larga, RTL, CJK, emoji y fallback deben fallar o permanecer dentro de
  bounds definidos.
- Playback: revisar primer frame, último frame, siete beats, seis transiciones, badges persistentes,
  bifurcación, gate y ausencia de audio.
- Estado máximo local: `RENDERED_DRAFT`; un receipt técnico puede registrar
  `RENDER_VALIDATED` o `POSTPRODUCTION_VALIDATED`, nunca aprobación humana.
