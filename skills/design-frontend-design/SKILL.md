---
name: design-frontend-design
description: This skill should be used when se diseña o rehace una interfaz web y se requiere una dirección visual distintiva, no plantillada. Cubre paleta opinada, emparejamiento tipográfico con personalidad, hero como tesis y un riesgo estético justificado; produce un plan de tokens compacto y reglas de ejecución para construirlo.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Frontend Design — dirección visual distintiva

Derivada de `frontend-design` (anthropics/skills, Apache-2.0). El homólogo traduce el principio del estudio de diseño que entrega a cada cliente una identidad visual irreductible: decisiones opinadas sobre paleta, tipografía y layout arraigadas en el sujeto del brief, con un riesgo estético deliberado y justificado. En MetodologIA, el skill opera como guía de evaluación local: produce un plan de diseño (tokens de color, tipo, layout, firma) y reglas de ejecución sin invocar CLIs externos ni abrir red.

## Cuándo usar

- El brief pide diseñar una interfaz nueva o rehacer una existente y rechaza resultados que se lean como plantilla.
- Hay que definir paleta, tipografía, jerarquía y un elemento memorable específico al sujeto, no genérico.
- Se necesita una dirección visual defendible antes de escribir código: tokens compactos + wireframe ASCII + justificación.
- Se requiere criticar un plan generado para detectar default-gravity (los tres clústeres que la IA produce sin intención).

## Cómo

1. **Arraigar en el sujeto.** Antes de diseñar, nombra un sujeto concreto, su audiencia y el trabajo único de la página. Si la memoria del proyecto contiene preferencias del humano o diseños previos, úsalos como pista. El mundo propio del sujeto —materiales, instrumentos, artefactos, vernáculo— es de donde salen las elecciones distintivas. Construye con el contenido real del brief, no con _lorem_.
2. **Hero como tesis.** Abre con lo más característico del mundo del sujeto en la forma que mejor lo exprese: titular, imagen, animación, demo viva, momento interactivo. Un número grande con etiqueta pequeña más acento en gradiente es la respuesta plantilla: solo si es genuinamente la mejor opción. Marca `coverage_gap` si el brief no permite identificar el elemento característico.
3. **Tipografía con personalidad.** Empareja display y body de forma deliberada, no las mismas familias de cualquier proyecto. Define una escala de tipo con pesos, anchos y espaciados intencionales. El tratamiento tipográfico debe ser memorable, no un vehículo neutro de entrega. Limita el display a su rol: carácter con mesura.
4. **Estructura como información.** Numeración, _eyebrows_, separadores, etiquetas deben codificar algo verdadero del contenido, no decorarlo. Los marcadores `01 / 02 / 03` solo proceden si el contenido es realmente una secuencia o línea de tiempo con orden informativo. Cuestiona cada dispositivo estructural antes de incorporarlo.
5. **Movimiento deliberado.** Considera dónde y si la animación sirve al sujeto: carga, _scroll reveal_, microinteracciones hover, ambiente. Un momento orquestado suele golpear más que efectos dispersos. A veces menos es más; animación extra contribuye a la sensación de diseño generado por IA.
6. **Calibrar contra los defaults.** La IA hoy agrupa en tres looks: (1) crema cálido ~#F4F1EA con serif de alto contraste y acento terracota; (2) casi negro con un acento verde ácido o vermellón; (3) broadsheet con hairlines, cero border-radius y columnas densas. Los tres son legítimos para algunos briefs pero son _defaults_, no _choices_: aparecen sin importar el sujeto. Donde el brief fija una dirección visual, síguela exacto — las palabras del brief siempre ganan. Donde deja un eje libre, no gastes esa libertad en un default.
7. **Plan en dos pasadas.** Primera pasada: genera un plan de tokens compacto — Color (4–6 hex nombrados), Tipo (display con mesura + body complementario + utilitario si hace falta), Layout (concepto en una frase + wireframe ASCII), Firma (el único elemento por el que se recordará la página). Segunda pasada: revisa el plan contra el brief antes de construir. Si alguna parte se lee como el default que producirías para cualquier página similar, revísala, di qué cambiaste y por qué. Solo después de confirmar la unicidad relativa del plan, deriva cada decisión de color y tipo de él.
8. **Una sola audacia.** Gasta la osadía en un lugar: que la firma sea lo memorable, y mantén todo lo demás callado y disciplinado. Quitar decoración que no sirve al brief es diseño. No asumir un riesgo puede ser un riesgo en sí. Construye hasta un piso de calidad sin anunciarlo: responsive a móvil, foco de teclado visible, `prefers-reduced-motion` respetado.
9. **Escritura como material de diseño.** Las palabras aparecen para hacer la interfaz más fácil de entender y usar. Nombra por lo que la persona controla, no por cómo se construye el sistema. Voz activa por defecto: el control dice qué pasa al usarlo. Los errores no se disculpan ni son vagos; una pantalla vacía es invitación a actuar. La cohesión del vocabulario es cómo la gente aprende a moverse.
10. **Autocrítica mientras construyes.** Critica tu propio trabajo al construir; una captura vale mil tokens. Antes de cerrar, aplica el consejo de Chanel: mírate al espejo y quita un accesorio. [INFERENCIA]

## Fail-closed

- NO invocar CLIs externos (`npx`, vendor scripts, binarios fuera del repo).
- NO abrir red ni hacer fetch a endpoints remotos.
- NO publicar ni desplegar; el skill es solo evaluación local.
- NO auto-ejecutar pipelines del DAG ni conectores; n8n permanece en dry-run.
- NO generar assets binarios no solicitados ni promocionar fuentes sin procedencia.
- Marca `coverage_gap` si falta el sujeto, la audiencia o el trabajo de la página; no adivines.

## Validación

```bash
pnpm verify:skills
```
