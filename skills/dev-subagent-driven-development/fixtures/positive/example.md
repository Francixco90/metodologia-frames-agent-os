case: El operador pide ejecutar un plan delegando cada tarea a un subagente fresco con contexto aislado, revisando la salida contra spec y calidad antes de avanzar, sin auto-despachar mutaciones ni commits.
context: Plan de implementación cerrado con tareas mayormente independientes, write-set declarado por tarea, ledger de progreso inicializado.
request: >-
Ejecuta este plan con subagent-driven development: tres tareas
independientes (hook de instalación, modos de recuperación, reporte de
progreso), cada una con su brief y write-set. Despacha un implementer a la
vez, revisa la salida de cada uno contra la spec y la calidad, y entra al
loop de fixes si hace falta.
expect:

- El skill descompone el plan en tres tareas con write-set e interfaces declaradas.
- Por cada tarea construye el contexto exacto del subagente: brief, interfaces de tareas anteriores, restricciones globales y contrato de reporte.
- Despacha un implementer a la vez (nunca en paralelo) y registra la identidad del subagente para reanudarlo en fixes.
- Recibe el reporte y ramifica por estado: DONE va a revisión, DONE_WITH_CONCERNS se leen primero, NEEDS_CONTEXT se re-despacha con contexto, BLOCKED se cambia algo antes de re-despachar.
- Revisa cada salida contra spec compliance y calidad; la auto-revisión del implementer no reemplaza la revisión del controlador.
- Si la revisión reporta spec fallido o findings críticos, entra al loop de fixes (máximo de rondas); pasado el tope adjudica cada finding abierto con ruling en el ledger.
- Todo despacho que muta el repositorio (commits, installs, deploys) queda detrás de confirmación explícita del operador (fail-closed).
- El skill NO auto-despacha subagentes que mutan, NO auto-arranca git/tests/installs/deploys; entrega el plan ejecutado y espera confirmación del operador para el siguiente gate.
