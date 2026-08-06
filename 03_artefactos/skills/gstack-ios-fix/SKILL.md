---
name: gstack-ios-fix
description: This skill should be used when systematically diagnosing and fixing a bug in a Swift or iOS application, reproducing the failure, isolating the root cause, proposing a patch, and verifying the fix.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# gstack-ios-fix — Diagnóstico y fix sistemático de bugs en iOS

## Cuándo invocar esta skill

Invócala cuando un bug en una app Swift/iOS deba diagnosticarse de forma
sistemática y repararse con un procedimiento verificable: reproducir el
fallo, aislar la causa raíz, formular hipótesis, proponer un patch y
verificar que el fix lo elimina. La skill cubre desde el síntoma visible
hasta la prueba de regresión, pasando por la cadena de evidencia que
sostiene cada decisión.

No edita a ciegas ni auto-aplica fixes: construye el camino de diagnóstico
antes de tocar fuentes y propone el patch mínimo tras confirmación explícita
del usuario.

## Principio de la capability

La capability **no edita archivos por sí sola**. Es una skill de evaluación
local fail-closed: reproduce el fallo, lee las fuentes, traza el flujo desde
el síntoma hasta la mutación de estado que lo origina, formula hipótesis de
causa raíz, y presenta el patch propuesto al usuario. La ejecución de
cualquier edit requiere confirmación explícita puerta por puerta. Sin
confirmación, no hay mutación.

Esto evita el fallo más común: parchear el síntoma sin reproducirlo, de modo
que el bug reaparece en otra rama de estado. La skill exige snapshot
reproductor antes de cualquier edit.

## Ley de hierro

**NO HAY FIX SIN SNAPSHOT REPRODUCTOR.** Antes de proponer cualquier edit a
fuentes Swift, la skill debe capturar un estado o caso de entrada que
reproduzca el bug de forma confiable. Ese snapshot se convierte en el
fixture de regresión. Un fix que aterriza sin snapshot reproductor es un
fix que habrá que re-fixar.

Si el bug no se puede reproducir de forma confiable, la skill se detiene y
lo reporta: marca `coverage_gap` y pide al usuario más datos de
reproducción antes de proseguir. No se infiere una causa raíz sin evidencia
reproductora.

## Fase 1: Reproducir el bug

1. Leer el reporte del bug: síntoma visible, pantalla o flujo afectado,
   condiciones de dispositivo/SO donde ocurre, y comportamiento esperado
   versus observado.
2. Reconstruir el camino de entrada que lleva al estado fallido: taps,
   swipes, tipos, o campos de estado relevantes. Documentar cada paso.
3. Capturar el estado reproductor: un snapshot de entrada (estado del view
   model, parámetros de navegación, o payload de red) que reproduzca el
   fallo de forma determinista. Guardarlo como fixture de pre-fix.
4. Capturar evidencia visible del bug: screenshot, log, o traza de
   instrumentación que muestre el síntoma en el estado reproductor.
5. Persistir una línea de descripción de qué está mal y qué se espera tras
   el fix.

Si la reproducción es no determinista (ej. race condition), la skill documenta
el patrón de ocurrencia y detiene el proceso hasta que el usuario confirme que
es suficiente o aporte más datos.

## Fase 2: Aislar la causa raíz

Sin causa raíz no hay fix. La skill lee las fuentes Swift, traza desde el
síntoma visible hacia atrás: la pantalla que falla, el view model que la
alimenta, el flujo de datos, y la mutación de estado que produce el
comportamiento erróneo. Identifica el cambio mínimo que repara el
comportamiento sin introducir regresiones.

Pasos:

1. Localizar el punto donde el síntoma se manifiesta (vista, binding,
   callback).
2. Trazar la cadena de datos hacia atrás hasta la mutación de estado que
   origina el comportamiento erróneo.
3. Enumerar las causas plausibles y descartar las que contradicen el
   snapshot reproductor.
4. Si quedan múltiples causas raíz plausibles tras el trazado, presentarlas
   al usuario y pedirle que elija cuál fixear antes de proseguir.
5. Identificar el cambio mínimo que repara el comportamiento: el archivo, la
   función, y la línea específica a editar.

La skill no salta de síntoma a patch: el trazado es obligatorio y se documenta en el reporte de diagnóstico.

## Fase 3: Hipótesis de fix

A partir de la causa raíz aislada, formular la hipótesis de fix:

1. Enunciar la hipótesis: "Editar X en `Archivo.swift:Línea` produce el
   comportamiento esperado porque Y."
2. Verificar que el patch propuesto no rompe invariantes existentes ni
   introduce nuevos síntomas en ramas de estado adyacentes.
3. Verificar que el patch es mínimo: no refactoriza, no renombra, no
   reorganiza más allá de lo necesario para reparar el comportamiento.
4. Si el patch toca más de un archivo o tiene efectos en cadencias de
   compilación, documentar el alcance y pedir confirmación explícita antes
   de proponer la ejecución.
5. Presentar el patch propuesto al usuario: diff esperado, archivos
   afectados, y motivo de cada cambio. Preguntar: aplicar, ajustar, o
   abortar.

## Fase 4: Verificar el fix

Tras la confirmación del usuario y la aplicación del patch:

1. Restaurar el estado reproductor (el snapshot de la Fase 1).
2. Tomar evidencia fresca: screenshot, log, o traza equivalente a la de
   pre-fix.
3. Comparar contra la evidencia pre-fix. Si el síntoma persiste, el fix no
   funcionó: revertir el patch y volver a la Fase 2 con la hipótesis
   revisada. Máximo 3 iteraciones antes de escalar al usuario.
4. Si el síntoma desaparece, capturar evidencia post-fix como fixture de
   regresión.
5. Verificar que el fix no introdujo síntomas nuevos en flujos adyacentes:
   correr los tests existentes y verificar que pasan.

## Fase 5: Fixture de regresión

Proponer un test de regresión que:

1. Cargue el snapshot reproductor de pre-fix.
2. Lo reproduzca en el contexto del fix aplicado.
3. Aserciones que validen el comportamiento post-fix (no el síntoma
   erróneo).
4. Sea determinista y no dependa de estado externo no controlado.

El test de regresión se propone al usuario y solo se escribe tras
confirmación. La skill no commitea el fixture ni el test: es decisión del
usuario.

## Qué NO hace la skill

- No edita fuentes ni aplica fixes en cadena sin confirmación explícita puerta por puerta.
- No Fuerza-push, amenda, ni muta historial git; no publica, no deploya, no activa conectores.
- No asume causa raíz sin snapshot reproductor; no extiende el patch más allá del cambio mínimo.

## Modos de fallo

| Síntoma                          | Acción                                                                 |
| -------------------------------- | ---------------------------------------------------------------------- |
| 3 iteraciones, bug persiste      | STOP, reportar al usuario con la mejor hipótesis actual                |
| Bug no reproductible             | STOP, marcar `coverage_gap`, pedir más datos de reproducción           |
| Build falla tras patch           | Revertir edits, investigar el error de compilación antes de re-aplicar |
| Múltiples causas raíz plausibles | Presentarlas al usuario, pedirle que elija antes de proseguir          |
| Patch toca flujos adyacentes     | Documentar alcance, pedir confirmación explícita antes de proponer     |

## Reversibilidad

Cada Edit propuesto es una operación git; el usuario puede `git restore`
para revertir. La skill nunca hace force-push, amenda, ni borra caché — esas
son decisiones del usuario.

## Fail-closed

Sin write-set, snapshot reproductor y confirmación explícita, la skill no
edita. Una ausencia no se sustituye por inferencia pulida. Si el trazado
encuentra referencias ambiguas o el snapshot no reproduce de forma
determinista, marca `coverage_gap` y pide al usuario que delimite antes de
proseguir.

Derivada de ios-fix (garrytan/gstack, MIT).
