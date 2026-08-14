# Alternativa A — Blueprint Executive

Estado: `DESIGN_OPTIONS_READY`  
Contenido: sintético, sin PII ni claims de una persona real. [CONFIG]

## Intención

[METODOLOGIA] Presentar liderazgo ejecutivo como un sistema legible: contexto,
decisión, ejecución y evidencia. La retícula técnica aporta identidad sin competir
con el contenido.

## Audiencia y tesis

- Audiencia primaria: dirección, hiring managers y responsables de transformación.
- Decisión que facilita: entender en menos de un minuto el alcance, la forma de
  operar y la clase de resultados que el perfil puede liderar.
- Tesis: método primero; IA donde amplifica una decisión o una operación.

## Jerarquía

1. Posicionamiento y propuesta de valor.
2. Tres señales de alcance, declaradas como ejemplo sintético.
3. Experiencia en secuencia `reto → decisión → resultado`.
4. Capacidades agrupadas por facultad, no por inventario de herramientas.
5. Evidencia profunda bajo demanda.

## Componentes

- Header compacto con marca, navegación, estado sintético y toggle de tema.
- Hero de dos columnas con rail de lectura reducido.
- Proof strip de tres señales comparables, sin apariencia de porcentaje.
- Timeline ejecutivo con metadatos y BLUF.
- Cards de capacidades con `<details>` para contexto no bloqueante.
- `<dialog>` para evidencia profunda con una sola X accesible.
- Tema navy predeterminado, tema light y salida impresa light.

## Ventajas

- Alta densidad informativa sin convertir la página en un dashboard.
- Reconocible como evolución del lenguaje blueprint de MetodologIA.
- Hace visibles relaciones entre estrategia, producto, transformación e IA.

## Límites y trade-offs

- La retícula exige control estricto de contraste y densidad.
- El rail lateral desaparece bajo 980 px para conservar el orden de lectura.
- No es la mejor opción cuando se busca una voz editorial cálida o muy narrativa.

## Criterios de aceptación

- Flujo completo sin JavaScript y mejoras progresivas con JavaScript.
- Navegación y controles operables por teclado; targets mínimos de 44 px.
- Reflow sin scroll horizontal desde 320 px y zoom al 200 %.
- Sin CDN, keywords ocultas, PII ni métricas presentadas como hechos reales.
- Impresión sin controles, fondos pesados ni contenido truncado.

## Decisión pendiente

[SUPUESTO] Esta alternativa no queda aprobada por existir el preview. Requiere una
decisión humana posterior ligada al hash del HTML y de este documento.
