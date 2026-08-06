# Subagent-Driven Development — receta (fases, handoff, modelo, riesgos)

Offloaded from `SKILL.md` (gateway router). Gobernado por `scripts/check-skill.mjs`
required list + `package_manifest_sha256`. No content cut — relocated.

## Las fases de la delegación

El skill ejecuta el plan en cinco fases. Cada fase produce un artefacto visible
que el operador revisa antes de avanzar.

1. **Descomponer.** Antes de despachar nada, leer el plan una vez, anotar su
   contexto y restricciones globales, y crear una tarea por cada unidad
   independiente del plan. Para cada tarea declarar: qué write-set tiene, qué
   interfaces toca de tareas anteriores, qué ambigüedad se le resolvió. Una
   tarea sin write-set claro es un `coverage_gap` — no se despacha a ciegas.
   Escanear el plan una vez por conflictos (tareas que se contradicen, cosas
   que el plan manda y el rubro de revisión trata como defecto) y presentarlos
   al operador como un lote antes de empezar — no un interrupt por descubrimiento
   a mitad del plan.

2. **Despachar.** Por cada tarea, construir el contexto exacto del subagente:
   el brief de la tarea, las interfaces de tareas anteriores que toca, las
   restricciones globales que la atan, la resolución de ambigüedades, y el
   contrato de reporte. El subagente no hereda la historia de la sesión — el
   controlador construye lo que necesita y nada más. Un dispatch describe una
   tarea, no la historia acumulada. Despachar un implementer a la vez (nunca
   en paralelo — conflictos). Registrar la identidad del subagente para
   reanudarlo en rondas de fix. Todo despacho que muta el repositorio
   (commits, installs, deploys) requiere confirmación explícita del operador
   antes de arrancar — fail-closed.

3. **Recibir el reporte.** El subagente reporta uno de cuatro estados:
   `DONE` (ir a revisión), `DONE_WITH_CONCERNS` (leer concerns antes de
   revisión; si son de corrección o scope, atender primero), `NEEDS_CONTEXT`
   (dar el contexto faltante y re-despachar), `BLOCKED` (cambiar algo antes de
   re-despachar — nunca forzar al mismo modelo a reintentar sin cambios). No
   se ignora una escalada ni se fuerza un retry sin modificar variable
   alguna. Si el subagente hace preguntas, se responden completo antes de que
   implemente.

4. **Revisar.** Toda salida de un subagente se revisa contra dos veredictos:
   compliance con la spec y calidad del código. La auto-revisión del
   implementer nunca reemplaza la revisión del controlador — ambas se
   necesitan. Si la revisión reporta spec fallido o findings críticos,
   entra al loop de fixes. Si reporta findings que chocan con el texto del
   plan, se le pregunta al operador cuál gobierna — no se descarta el finding
   porque el plan lo mande. No se pre-juzgan findings para el reviewer
   ("no flagues X", "no trates Y como defecto") — si parece falso positivo,
   se deja que el reviewer lo levante y se adjudica en el loop.

5. **Adjudicar.** El loop de fixes tiene un máximo de rondas. Pasado el tope,
   el controlador adjudica cada finding abierto: lo estaciona con ruling si es
   discutible o no load-bearing, o detiene con `BLOCKED` si es real y
   load-bearing — porque estacionar un fallo estructural deja que cada tarea
   dependiente construya sobre él. Adjudicar antes del tope para terminar un
   loop es pre-juzgar con otro nombre. Toda adjudicación es un entrada en el
   ledger — un descarte silencioso está prohibido.

**Regla anti-skip:** no se avanza a la siguiente tarea mientras la revisión
tiene findings críticos abiertos que no están ni fijados ni estacionados con
ruling al tope. Si el operador pide "salta al final", se entrega el estado
parcial y se documentan los gaps; no se salta a concluir sin revisar. Se
delega en orden — siempre.

## Handoff de contexto

El contexto que se pega en un dispatch — y todo lo que un subagente imprime de
vuelta — se queda residente en la sesión del controlador y se relee en cada
turno posterior. Por eso los artefactos se pasan como archivos, no como
prosa: el brief, el reporte y el paquete de revisión viven en archivos y el
subagente los lee en una llamada. Un dispatch describe una tarea, no la
historia de la sesión. No se pega "estado después de Tareas 1-3" en
dispatches posteriores — un subagente fresco necesita su tarea, las
interfaces que toca y las restricciones globales. Nada más.

El ledger es el mapa de recuperación: lo que el ledger nombra existe en git
aunque el contexto del controlador ya no lo recuerde. Después de una
compaction, se confía en el ledger y `git log` sobre la memoria del
controlador. Un controlador sin ledger ha re-despachado secuencias completas
de tareas ya hechas — el fallo más caro observado.

## Selección de modelo

Despachar en el modelo menos potente que maneje cada rol para conservar costo
y velocidad. Tareas mecánicas de implementación (funciones aisladas, spec
completa, 1-2 archivos) → modelo rápido y barato. Tareas de integración y
juicio (coordinación multi-archivo, debugging) → modelo estándar. Tareas de
arquitectura y diseño → modelo más capaz. La revisión final de la rama es una
de estas — se despacha en el modelo más capaz disponible, no en el default de
la sesión. Siempre especificar el modelo explícitamente al despachar: un
modelo omitido hereda el de la sesión (silenciosamente el más caro).

El conteo de turnos le gana al precio por token. Los modelos baratos suelen
tomar 2-3× los turnos en trabajo multi-paso — cuestan más en total. Usar
modelo mid-tier como piso para reviewers y para implementers que trabajan de
descripciones en prosa. Cuando el plan trae el código completo a escribir, la
implementación es transcripción + tests: modelo más barato.

## Riesgos

- **Re-dispatch de tareas ya hechas** — el ledger es el antídoto. Sin
  ledger, la compaction borra el progreso y el controlador re-despacha.
- **Context pollution** — el controlador que pega historial acumulado en cada
  dispatch pierde su propio contexto. Handoff como archivos, no como prosa.
- **Pre-juzgar findings** — instruir al reviewer que ignore algo es
  pre-adjudicar. Se deja al reviewer levantar y se adjudica en el loop.
- **Adjudicar antes del tope** — terminar un loop temprano para "avanzar" es
  pre-juzgar disfrazado. Se adjudica solo al tope y toda adjudicación es
  entrada de ledger.
- **Despachar en paralelo implementers** — conflictos. Uno a la vez.
- **Confundir delegar con abandonar** — toda salida se revisa; delegar no
  exime del gate de spec + calidad.