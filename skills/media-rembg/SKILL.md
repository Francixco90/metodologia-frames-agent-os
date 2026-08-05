---
name: media-rembg
description: This skill should be used when the user wants to remove the background from an image using the rembg tool, describing the capability and required confirmation before any binary execution or environment setup is performed.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# media-rembg — background removal (fail-closed)

Remueve el fondo de imágenes (recorte de sujeto con transparencia PNG) usando
`rembg`. La habilidad **describe** la capacidad y los modelos disponibles, pero
**no ejecuta** el binario, **no instala** el entorno y **no descarga** modelos
sin confirmación explícita del usuario.

## Qué hace rembg

`rembg` toma una imagen (o una carpeta de imágenes) y devuelve un recorte del
sujeto sobre fondo transparente. A nivel de capacidad soporta:

- Entrada **archivo único** → salida `*_rembg.png` junto al original.
- Entrada **carpeta** → carpeta de recortes paralela.
- Varios modelos de segmentación (general, anime, retrato, bordes finos).
- Ajuste de calidad: post-procesamiento de máscara, alpha matting, erosión.

## Cuándo usarla

Usa esta habilidad cuando el usuario quiera: quitar/eliminar el fondo de una
imagen, recortar o aislar un sujeto, generar un PNG transparente, extraer un
objeto en primer plano, o procesar por lotes una carpeta de imágenes.

## Frontera fail-closed (no negociable)

Esta habilidad es **fail-closed**: describe, no ejecuta.

- **NUNCA** invocar el binario `rembg` automáticamente.
- **NUNCA** crear/instalar un entorno conda/venv automáticamente.
- **NUNCA** descargar modelos desde la red automáticamente.
- **SIEMPRE** requerir confirmación explícita del usuario antes de cualquier
  ejecución, instalación de entorno o descarga de modelo.
- Antes de la confirmación, solo se describe la capability y se lista lo que
  se ejecutaría.

Si el binario `rembg` no está presente, marca `coverage_gap` y notifica al
usuario que se requiere instalación confirmada. No inferir disponibilidad.

## Modelos y banderas (alto nivel)

`rembg` permite elegir modelo (`-m`) y banderas de afinación de bordes
(post-procesamiento de máscara, alpha matting con erosión). El modelo por
defecto es de propósito general. Existen modelos orientados a anime, retrato
y bordes finos. Los detalles de afinación se dejan a la ejecución confirmada.

## coverage_gap

Sin binario `rembg` disponible y sin confirmación de instalación →
`coverage_gap`. La habilidad reporta ausencia y escala; no sustituye la
ausencia con una inferencia.

Derivada de rembg (OpenGHz/rembg-bg-removal, MIT).
