# Biblioteca de prompts editoriales y visuales

Versión: `v1.1`
Estado: `ACTIVE_TEMPLATE_LIBRARY`
Reemplaza: `18-templates--copy-and-visual-prompt-library--v1.0`

Esta versión completa endurece el prompt visual y prevalece sobre `v1.0`. Compila intención natural en briefs específicos; no existe un prompt universal para todos los formatos. [METODOLOGIA]

## Bloque común obligatorio

```text
AUDIENCIA: [quién decide, aprende o actúa]
OBJETIVO: [cambio observable]
TESIS: [una oración]
FUENTES EXPLÍCITAS: [source_ids]
EVIDENCIA: [claims permitidos y límites]
ACTIVOS: [asset_ids aprobados o ninguno]
FORMATO: [canal, proporción, extensión o conteo]
IDIOMA: español latino neutro, tú
ESTADO DE SALIDA: borrador; no publicado
```

## Plantilla de redacción

```text
Actúa como editor de MetodologIA. Redacta un [FORMATO] para [AUDIENCIA].
Abre con la conclusión o una tensión verdadera y resuélvela en el cuerpo.
Usa tesis -> hasta tres apoyos -> evidencia/ejemplo -> límite -> un CTA.
Mantén una voz directa, serena, humana y metódica. La IA es aliada;
propósito, criterio y aprobación permanecen en la persona.
No inventes datos, citas, atribuciones ni beneficios. Marca [coverage_gap].
Entrega únicamente [estructura, extensión y campos de aceptación].
```

## Variantes por formato

- **LinkedIn:** hook específico de una o dos líneas; situación; tesis; hasta tres apoyos; ejemplo; límite; punchline; CTA de un movimiento. Sin clickbait ni hashtags genéricos.
- **One-pager:** decisión principal; para quién/para qué; problema; método; evidencia; límites; siguiente paso. Títulos-conclusión y bloques escaneables.
- **Deck/carrusel:** exactamente `[N]` unidades; una idea y un título-conclusión por unidad; tensión; costo; reencuadre; método; ejemplo; verificación; cierre. Sin slides fuera del conteo.
- **Formación:** pregunta o síntoma; explicación; ejemplo; práctica; criterio de aceptación; reflexión.

## Prompt visual autocontenido

```text
Identidad visible exclusiva: MetodologIA.
Estética: Neo-Swiss Clean and Soft Explainer (Corporate Clean and Premium).
Fondo blanco #FFFFFF funcional dominante como sustrato; navy #122562 como
ancla; grid suizo, columnas y abundante espacio negativo. Ilustración
vectorial flat, vibrante y funcional. Humanos sin rostro solo cuando explican
una acción. Formas geométricas suaves, sombras suaves, microgradientes
discretos e iconografía consistente. UI permitida: chips, checklists, timers,
cards, tabs y badges.

Paleta cromática exclusiva: #122562, #FFD700, #137DC5, #1F2833, #BBA0CC,
#808080. #FFFFFF y transparencia son solo sustrato/espacio negativo. Usa
#FFD700 únicamente para foco, decisión o elemento activo; nunca texto blanco
sobre oro. Poppins para titulares, Montserrat para cuerpo y Trebuchet para
notas pequeñas, footnotes, popups, chips y callouts. Declara pesos, tamaños,
interlineados, fallback y disponibilidad en el brief de formato.

Composición [FORMATO]: [tesis visual], [columna de texto], [visual
explicativo], [jerarquía], [numeración/footer]. Texto grande, alto contraste;
nunca texto sobre fotografías, ilustraciones complejas o fondos ruidosos.
El visual explica; no decora. No dependas solo del color para comunicar estado.

Negative prompt: sin 3D, ciberpunk, fotorealismo generado, fondos
cinematográficos, glassmorphism excesivo, neón, texturas densas, decoración
vacía, iconos inconsistentes, demasiados gradientes, texto sobre imagen,
marcas externas ni colores fuera de paleta.
```

## Aplicación de activos

```text
No generes logos ni identidades. Reserva una zona segura para [asset_id].
Inserta el master aprobado en postproducción sin redibujar, recolorear,
deformar o completar por IA. Usa retratos solo si el manifiesto declara
APPROVED y el uso solicitado está incluido. Si falta derecho o master: BLOCKED.
```

## Compilación y verificación

1. sustituye cada placeholder;
2. selecciona `source_ids` explícitos;
3. comprueba claims, pesos tipográficos, contraste y derechos de activos;
4. usa una variante de formato, no una mezcla genérica;
5. fija aceptación: conteo, extensión, idioma, formato, fuentes y legibilidad;
6. descarga y relee la salida real antes de declarar tipo, contenido o calidad.
