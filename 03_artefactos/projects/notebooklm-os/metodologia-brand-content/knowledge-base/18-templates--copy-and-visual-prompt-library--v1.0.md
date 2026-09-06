# Biblioteca de prompts editoriales y visuales

Versión: `v1.0`
Estado: `ACTIVE_TEMPLATE_LIBRARY`

Estas plantillas compilan intención natural en briefs específicos. No existe un prompt universal para todos los formatos. Cada ejecución debe seleccionar fuentes, audiencia, evidencia, activos y criterios propios. [METODOLOGIA]

## Bloque común obligatorio

Completa antes de usar una plantilla:

```text
AUDIENCIA: [quién decide, aprende o actúa]
OBJETIVO: [cambio observable]
TESIS: [una oración]
FUENTES EXPLÍCITAS: [source_ids]
EVIDENCIA: [claims permitidos y límites]
ACTIVOS: [asset_ids aprobados o ninguno]
IDIOMA: español latino neutro, tú
ESTADO DE SALIDA: borrador; no publicado
```

## Prompt de redacción

```text
Actúa como editor de MetodologIA. Redacta un [formato] para [AUDIENCIA].
Abre con la conclusión o una tensión verdadera y resuélvela en el cuerpo.
Usa tesis -> hasta tres apoyos -> evidencia/ejemplo -> límite -> un CTA.
Mantén una voz directa, serena, humana y metódica. La IA es aliada;
propósito, criterio y aprobación permanecen en la persona.
No inventes datos, citas, atribuciones ni beneficios. Marca [coverage_gap].
Entrega únicamente [estructura, extensión y campos de aceptación].
```

## Prompt de LinkedIn

```text
Crea un post de [extensión] con: hook específico de 1-2 líneas, situación
reconocible, tesis, máximo tres apoyos, un ejemplo verificable, un límite,
punchline y CTA de un movimiento. Párrafos cortos. Sin clickbait, urgencia
artificial, hashtags genéricos ni promesas absolutas.
```

## Prompt de one-pager

```text
Diseña el contenido de un one-pager autosuficiente. Orden: decisión principal;
para quién y para qué; problema; método; evidencia; límites; siguiente paso.
Usa títulos-conclusión y bloques escaneables. Separa hechos de inferencias.
```

## Prompt de deck o carrusel

```text
Crea exactamente [N] unidades. Una idea y un título-conclusión por unidad.
Arquitectura: tensión -> costo -> reencuadre -> método -> ejemplo ->
verificación -> cierre. Define palabras máximas, visual explicativo y fuente
por unidad. No agregues agenda o apéndice fuera del conteo.
```

## Prompt visual completo

```text
Identidad visible exclusiva: MetodologIA.
Estética: Neo-Swiss Clean and Soft Explainer (Corporate Clean and Premium).
Fondo blanco funcional dominante; navy #122562 como ancla; grid suizo,
columnas y abundante espacio negativo. Ilustración vectorial flat, vibrante
y funcional. Humanos sin rostro solo para explicar una acción. Formas suaves,
sombras suaves, microgradientes discretos e iconografía consistente. UI:
chips, checklists, timers, cards, tabs y badges.

Paleta exclusiva: #122562, #FFD700, #137DC5, #1F2833, #BBA0CC, #808080.
Usa #FFD700 solo para foco, decisión o elemento activo; nunca texto blanco
sobre oro. Poppins para titulares, Montserrat para cuerpo y Trebuchet para
notas pequeñas, footnotes, popups, chips y callouts.

Composición [formato y proporción]: [tesis visual], [columna de texto],
[visual explicativo], [jerarquía], [numeración/footer]. Texto grande, alto
contraste y nunca sobre fondos ruidosos.

No uses 3D, ciberpunk, fotorealismo generado, fondos cinematográficos,
glassmorphism excesivo, neón, texturas densas, decoración vacía, iconos
inconsistentes, marcas externas ni colores fuera de paleta.
```

## Prompt de aplicación de activos

```text
No generes logos ni identidades. Reserva una zona segura para [asset_id].
El master aprobado se insertará en postproducción sin redibujar, recolorear,
deformar o completar por IA. Usa retratos solo si el manifiesto declara
APPROVED y el uso solicitado está incluido. Si falta derecho o master: BLOCKED.
```

## Compilación y verificación

Antes de generar:

1. sustituye cada placeholder;
2. selecciona `source_ids` explícitos;
3. comprueba claims y derechos de activos;
4. elige una plantilla de formato, no una mezcla genérica;
5. define aceptación: conteo, extensión, idioma, formato, fuentes y legibilidad.

Después de generar, descarga y relee la salida. Verifica tipo real, texto, paleta, tipografía disponible, assets usados, citas y gaps. Una vista previa no acredita bytes finales ni calidad. [METODOLOGIA]
