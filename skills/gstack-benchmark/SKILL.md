---
name: gstack-benchmark
description: This skill should be used when detecting performance regressions by comparing measurements against a baseline, running page speed checks, or establishing performance benchmarks with repeatable measurement methodology.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# gstack-benchmark — detección de regresiones de rendimiento

El rol aquí es el de un ingeniero de rendimiento que recibe la intención de
medir y diseña la metodología de benchmark antes de que exista cualquier
captura. Una regresión de rendimiento no cae de un golpe: muere por mil cortes
de papel. Cada cambio añade 50ms aquí, 20KB allá, y un día la página tarda ocho
segundos en cargar y nadie sabe cuándo se puso lenta. Este skill interroga la
intención dimensión por dimensión hasta que queda una metodología tight — sin
huecos, sin umbrales adivinados, sin comparaciones implícitas. El entregable
es la metodología en prosa, listo para que el operador decida ejecutarla. No
medición automática. No red. No ejecución sin confirmación.

La premisa es simple: un benchmark sin línea base no detecta regresiones, solo
reporta absolutos. "mide el tiempo de carga" no sirve — se declara qué métrica
se captura, con qué instrumento, cuántas repeticiones, en qué condiciones—;
"si tarda mucho, alerta" no sirve — se declara el umbral relativo y absoluto,
qué severidad, qué acción—; "compara antes y después" no sirve — se declara
qué rutas, qué baseline, qué tolerancia a transitorios. No se adivina: si no
se sabe algo de la medición, se dice y se pregunta, o se lee el contexto
primero. Sin línea base, se marca `coverage_gap` y no se avanza.

## Cuándo usar

Usar este skill cuando el operador pide:

- "mide el rendimiento" / "benchmark de esta página"
- "detecta regresión de rendimiento" / "¿se puso lento?"
- "establece una línea base de rendimiento"
- "compara el rendimiento contra el baseline"
- "verifica la velocidad de carga" / "page speed check"
- cualquier cambio donde el operador quiere detección de regresión con
  medición repetible antes de aprobar la liberación.

No usar cuando lo que se necesita es profiling en vivo de un proceso en
ejecución (ahí toca observabilidad, no benchmark), ni cuando se quiere un
reporte de performance sin comparación (ahí basta una captura, no una
metodología). En esos casos otra habilidad toma el relevo.

## Las dimensiones del benchmark

El skill diseña el benchmark a lo largo de cinco dimensiones. Cada dimensión
produce un artefacto visible que el operador revisa antes de avanzar.

1. **Línea base.** Antes de cualquier comparación, definir qué se mide y cómo.
   La línea base es la referencia contra la que se comparan las mediciones
   futuras: tiempo a primer byte, first contentful paint, largest
   contentful paint, tiempo de carga total, tamaño de bundle, conteo de
   recursos. Para cada página/ruta a medir, declarar: qué métrica se captura,
   con qué instrumento, cuántas repeticiones se promedian, dónde se guarda la
   línea base, cuándo se toma (antes del cambio, siempre). Sin línea base, el
   benchmark es un reporte de absolutos sin comparación — se marca
   `coverage_gap` y no se avanza.

2. **Medición.** Definir el protocolo de captura. Para cada métrica declarar:
   cómo se mide (instrumento, API de performance del navegador, captura
   programada), cuántas repeticiones se promedian (una sola captura no es
   medición, es anécdota), en qué condiciones (caché fría, caché caliente,
   red simulada), qué se registra. La medición debe ser repetible: si dos
   operadores siguen el protocolo, los números deben converger. Si el
   protocolo no es repetible, se marca `coverage_gap`.

3. **Comparación.** Definir cómo se compara la medición contra la línea base.
   Para cada métrica declarar: delta absoluto (ms actual - ms baseline), delta
   relativo ((actual - baseline) / baseline), dirección (regresión es
   incremento, mejora es reducción). La comparación es relativa: 2000ms de
   carga es aceptable para un dashboard complejo, pésimo para una landing. Se
   compara contra TU baseline, no contra un estándar genérico.

4. **Umbrales.** Definir qué dispara cada clasificación. Umbrales relativos,
   no absolutos: un aumento del 50% O un absoluto de +500ms en timing es
   regresión; un aumento del 25% en bundle es regresión; un aumento del 30%
   en conteo de peticiones es advertencia. Para cada métrica declarar el
   umbral de advertencia, el umbral de regresión, y qué acción sigue
   (investigar, bloquear, aprobar con nota). Los umbrales son del operador,
   no del skill: si el operador no los declara, se pregunta — no se adivina.

5. **Veredicto.** Producir el reporte comparativo: por página, por métrica,
   baseline vs actual, delta, estado (OK / ADVERTENCIA / REGRESIÓN), conteo
   de regresiones, recomendaciones de investigación. El veredicto es
   observación: reporta lo que la medición muestra. No aprueba, no bloquea,
   no ejecuta. La decisión de actuar sobre una regresión es del operador.

## Modo fail-closed

El skill es `local-evaluation` únicamente. No lanza mediciones, no abre
navegadores, no accede a red, no ejecuta procesos de captura, no escribe a
disco sin confirmación. Toda medición queda tras confirmación explícita del
operador. Si el operador no confirma, el skill entrega la metodología en
prosa y se detiene. Una metodología de benchmark no es una medición ejecutada
— la confirmación explícita del operador es el gate que falta antes de
cualquier captura.

## Reglas importantes

- **Medir, no adivinar.** Si no se puede medir una métrica, se marca
  `coverage_gap`. No se estiman números.
- **Línea base es esencial.** Sin baseline no hay regresión, solo absolutos.
  Se alienta siempre la captura de baseline antes del cambio.
- **Umbrales relativos, no absolutos.** Lo que es lento para una landing es
  rápido para un dashboard. Se compara contra TU baseline.
- **El bundle es indicador líder.** El tiempo de carga varía con la red. El
  tamaño de bundle es determinista. Se rastrea con disciplina.
- **Terceros son contexto.** Se señalan, pero el operador no puede arreglar
  que un analytics sea lento. Las recomendaciones se enfocan en recursos
  propios.
- **Read-only.** Se produce el reporte. No se modifica código salvo pedido
  explícito.

Derivada de benchmark (garrytan/gstack, MIT).
