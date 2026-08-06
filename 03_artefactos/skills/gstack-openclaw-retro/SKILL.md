---
name: gstack-openclaw-retro
description: This skill should be used when generating a weekly engineering retrospective, analyzing commit history and work patterns, producing team-aware per-contributor praise and growth areas, or tracking engineering trends over time.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# gstack-openclaw-retro — Retrospectiva semanal de ingeniería

## Cuándo invocar esta skill

Invócala cuando se necesite una retrospectiva semanal de ingeniería: analizar
el historial de commits de un periodo, extraer patrones de trabajo, producir
un análisis por contribuidor con praise y growth areas anclados en commits
reales, y comparar contra retros previas para detectar tendencias.

## Principio de la capability

La retrospectiva **no es un resumen de actividad**. Su trabajo es convertir el
historial de commits en una narrativa ingenieril útil: qué se envió, cómo se
trabajó, dónde se concentró el esfuerzo, qué señales de calidad aparecieron, y
qué hábitos conviene adoptar o corregir la próxima semana. El análisis es
team-aware: identifica a la persona que lee la retrospectiva, la trata con
profundidad en primera persona, y a cada compañera con praise específico y
growth area específico, ambos anclados en commits reales — nunca "buen trabajo"
sin nombrar qué fue bueno.

El usuario mantiene el 100% del control; la salida es prosa y el usuario decide
qué comandos correr.

## Argumentos

- Default: últimos 7 días.
- `24h`: últimas 24 horas.
- `14d`: últimos 14 días.
- `30d`: últimos 30 días.
- `compare`: comparar la ventana actual contra la ventana previa de igual
  longitud.

## Metodología

### Paso 1: Acordar ventana y confirmar comandos

Confirmar con el usuario la ventana temporal antes de cualquier consulta. Para
unidades de día, alinear el inicio a medianoche del timezone local. Para horas,
usar "N hours ago". Presentar la lista exacta de comandos git que se ejecutarán
y esperar confirmación explícita; sin confirmación no hay ejecución. Marcar
`coverage_gap` si no es un repo git o no hay commits en la ventana.

### Paso 2: Recolectar historial

Con permiso del usuario, recolectar:

- Commits con hash, autor, timestamp, subject y shortstat.
- Desglose por commit con numstat para separar líneas de test vs producción.
- Timestamps ordenados para detección de sesiones y distribución horaria.
- Archivos más frecuentemente modificados (hotspots).
- Mensajes de commit para extraer PRs y prefixes convencionales.
- Conteo por autor y hotspots por autor.
- Archivos de test tocados en la ventana.

Todos los tiempos se reportan en el timezone local del usuario. Nunca setear
`TZ` por la fuerza.

### Paso 3: Calcular métricas

Producir un resumen con: commits a main, contribuidores, PRs mergeados,
inserciones totales, deleciones totales, LOC neto, LOC de test, ratio de test,
rango de versiones, días activos, sesiones detectadas, LOC por hora de sesión
activa. Luego un leaderboard por autor ordenado por commits descendente. La
persona que lee la retrospectiva siempre aparece primera, etiquetada como "Tú
(nombre)".

### Paso 4: Distribución temporal

Construir un histograma por hora local. Identificar horas pico, zonas muertas,
patrón bimodal mañana/tarde vs continuo, y clústeres de código nocturno
(después de las 22:00).

### Paso 5: Detección de sesiones

Detectar sesiones usando un umbral de 45 minutos entre commits consecutivos.
Clasificar en sesiones profundas (50+ min), medias (20–50 min) y micro (<20
min, commit único). Calcular tiempo activo total, longitud promedio de sesión
y LOC por hora activa.

### Paso 6: Desglose por tipo de commit

Categorizar por prefix convencional (feat, fix, refactor, test, chore, docs).
Mostrar como barras de porcentaje. Marcar si el ratio de fix supera el 50%:
señal de "ship fast, fix fast" que puede indicar gaps de revisión.

### Paso 7: Hotspots

Mostrar los 10 archivos más modificados. Marcar archivos cambiados 5+ veces
(churn hotspots), separar tests de producción, y notar frecuencia de
VERSION/CHANGELOG.

### Paso 8: Distribución de tamaño de PR

Estimar tamaños de PR y agrupar en Small (<100 LOC), Medium (100–500), Large
(500–1500), XL (1500+).

### Paso 9: Focus score y Ship of the week

Focus score: porcentaje de commits que tocan el directorio top más modificado.
Más alto = trabajo enfocado; más bajo = context-switching disperso. Ship of the
week: el PR de mayor LOC de la ventana, con número, LOC cambiadas y por qué
importa.

### Paso 10: Análisis por contribuidor

Para cada contribuidor, incluyendo a la persona que lee:

1. Commits y LOC: totales, inserciones, deleciones, neto.
2. Áreas de foco: directorios/archivos más tocados (top 3).
3. Mix de tipos de commit: desglose personal feat/fix/refactor/test.
4. Patrones de sesión: horas pico, conteo de sesiones.
5. Disciplina de test: ratio personal de LOC de test.
6. Mayor ship: el commit o PR de mayor impacto.

Para la persona que lee: tratamiento más profundo, todo el análisis de sesión
y patrones temporales, redactado en primera persona. Para cada compañera: 2–3
frases sobre qué envió y su patrón, luego:

- **Praise** (1–2 cosas específicas): anclado en commits reales. No "buen
  trabajo"; nombrar exactamente qué fue bueno.
- **Oportunidad de growth** (1 cosa específica): enmarcada como level-up, no
  como crítica. Anclada en datos reales.

En repo solitario: omitir el desglose de equipo. Si los commits tienen
trailers `Co-Authored-By` de IA, trackear "commits asistidos por IA" como
métrica separada.

### Paso 11: Tendencias semana contra semana (si ventana >= 14d)

Dividir en buckets semanales y mostrar tendencias: commits por semana (total y
por autor), LOC por semana, ratio de test, ratio de fix, sesiones por semana.

### Paso 12: Streaks

Contar días consecutivos con al menos un commit, hacia atrás desde hoy. Mostrar
streak de equipo y streak personal.

### Paso 13: Cargar historial y comparar

Si existen retrospectivas previas guardadas, cargar la más reciente y calcular
deltas: ratio de test, sesiones, LOC/hora, ratio de fix. Mostrar con flechas de
mejora/regresión. Si no hay previas, anotar "Primera retrospectiva registrada;
correr de nuevo la próxima semana para ver tendencias."

### Paso 14: Guardar snapshot

Guardar un snapshot JSON en `memory/retro-YYYY-MM-DD.json` con métricas, autores,
rango de versiones, streak y resumen twitteable. Esto es persistencia de
historial para trend tracking futuro.

### Paso 15: Escribir la narrativa

Estructurar la salida en secciones: resumen, tendencias vs última retro, patrones
temporales y de sesión, velocidad de shipping, señales de calidad de código,
foco y highlights, tu semana, desglose de equipo, top 3 wins del equipo, 3 cosas
a mejorar, 3 hábitos para la próxima semana. Los items a mejorar y los hábitos
deben ser específicos, accionables y anclados en commits.

## Modo compare

Cuando el usuario pida "compare": correr la retro para la ventana actual y la
previa de igual longitud, presentar métricas lado a lado con flechas de
mejora/regresión y una narrativa de los mayores cambios.

## Límite de fail-closed

La skill no ejecuta git, no hace fetch de la red, no muta el repositorio. Toda
invocación de git requiere confirmación explícita; sin confirmación no hay
ejecución. La salida es prosa auditable. Marcar `coverage_gap` si falta contexto
bloqueante.

## Estado de completitud

- DONE — retrospectiva generada, historial guardado.
- DONE_WITH_CONCERNS — generada con datos faltantes (ej. sin retros previas).
- BLOCKED — no es un repo git o no hay commits en la ventana.

Derivada de gstack-openclaw-retro (garrytan/gstack, MIT).
