# Alternativa B — Neo-Swiss Editorial

Estado: `DESIGN_OPTIONS_READY`  
Contenido: sintético, sin PII ni claims de una persona real. [CONFIG]

## Intención

[METODOLOGIA] Traducir la gramática visual de `ruta-workshops` a un CV ejecutivo:
tipografía protagonista, aire, asimetría controlada y dorado como señal de decisión.

## Audiencia y tesis

- Audiencia primaria: dirección, producto, innovación y clientes de consultoría.
- Decisión que facilita: reconocer con rapidez una voz estratégica capaz de
  convertir ambigüedad en una ruta operable.
- Tesis: claridad editorial para explicar transformación compleja sin trivializarla.

## Jerarquía

1. Una promesa breve, seguida por el tipo de liderazgo ofrecido.
2. Señales de impacto como titulares editoriales, no como tablero.
3. Experiencia organizada en capítulos y decisiones.
4. Capacidades como índice de intervención.
5. Evidencia y límites disponibles bajo demanda.

## Componentes

- Header horizontal con marca, navegación y toggle de tema.
- Hero asimétrico de gran escala con módulo de disponibilidad sintética.
- Banda editorial de resultados con ritmo tipográfico.
- Capítulos de experiencia con numeración visible.
- Índice de capacidades con `<details>`.
- `<dialog>` para evidencia profunda con una única X accesible.
- Tema navy predeterminado, tema light y salida impresa light.

## Ventajas

- Mayor respiración, recordación y afinidad con la referencia `ruta-workshops`.
- Prioriza la lectura humana sin parecer una landing genérica.
- Funciona bien para propuestas de valor que necesitan contexto y criterio.

## Límites y trade-offs

- Muestra menos información simultánea que Blueprint Executive.
- La escala tipográfica necesita límites de caracteres estrictos.
- Los resultados no se leen como un dashboard; se leen como evidencia editorial.

## Criterios de aceptación

- Flujo completo sin JavaScript y mejoras progresivas con JavaScript.
- Navegación y controles operables por teclado; targets mínimos de 44 px.
- Reflow sin scroll horizontal desde 320 px y zoom al 200 %.
- Sin CDN, keywords ocultas, PII ni métricas presentadas como hechos reales.
- Impresión sin controles, fondos pesados ni contenido truncado.

## Decisión pendiente

[SUPUESTO] Esta alternativa no queda aprobada por existir el preview. Requiere una
decisión humana posterior ligada al hash del HTML y de este documento.
