# Adaptadores homologados para Frames

Cargar solo el capítulo resuelto por el router. Todos los adapters preservan
las instrucciones L1 y aplican fallback verbatim ante `UNKNOWN`.

## rtk

Activar para salida local repetitiva de tests, build, lint, búsqueda o Git cuyo
original se pueda conservar y recuperar. RTK transforma tool output; no reduce
por sí mismo tokens facturados ni intercepta herramientas nativas fuera de la
shell. [METODOLOGIA][CONFIG]

Registrar comando argv, versión, baseline y ruta privada del original. Preservar
exit code, errores, warnings, hashes, citas y evidence tags. Aplicar un único
transformador, medir reducción y contrastar campos críticos. Ante equivalencia
`UNKNOWN`, entregar verbatim. No usar en RT-09, RT-11, aprobaciones, claims
source-first ni outputs humanos. Detener ante warning perdido, hook collision,
comando no allowlisted o raw output irrecuperable.

## caveman

Activar solo para updates internos y handoffs operativos donde frases cortas
reduzcan ruido sin borrar estado, evidencia o decisión. Es una convención de
interacción, no un compresor verificable. [METODOLOGIA][CONFIG]

Conservar IDs, estados, owners, gates, hashes, riesgos y `coverage_gap`; mantener
exactos comandos, rutas relativas y errores. Apagar para copy, guiones, piezas
visuales, documentación humana, fuentes, derechos, accesibilidad, RT-09, RT-11
y H01. Usar lenguaje normal si la audiencia es externa o la abreviatura altera
una decisión. Detener ante identidad externa, pérdida de matiz o ambigüedad.

## graphify

Activar para relaciones entre módulos, registries, DAG, callers o contratos que
no se resuelvan económicamente con búsqueda directa. El grafo es índice derivado,
nunca autoridad. [METODOLOGIA][CONFIG]

Limitar corpus a código y configuración allowlisted; excluir inbox, fuentes,
receipts privados, prompts reales y artefactos de cliente. Guardar el índice
fuera de Git con base SHA, scope y versión. Verificar cada edge crítico en su
archivo fuente e invalidar al cambiar SHA o scope. No usar background indexing
ni auto-MCP. Preferir `rg` para búsquedas pequeñas. Detener ante PII, egress,
grafo stale, origen irresoluble o costo mayor al read set directo.

## claude-native-toolkit

Activar al elegir una primitiva de coordinación, inventariar capacidad Claude o
generar un adapter. El toolkit es sidecar; el gobierno portable de Frames sigue
siendo autoridad. [METODOLOGIA][CONFIG]

Usar `direct` para una superficie/writer; `chain` para dependencias secuenciales;
`subagent` para juicio, write set independiente o separación de funciones; y
`dynamic workflow` para campañas repetibles con branching/retry. Mantener Agent
Teams apagado hasta experimento aprobado. Limitar a lead + dos especialistas;
secuenciar verifier y Guardian. Declarar objetivo, sets, budget, output, verifier
y stop rule. No autoinstalar plugins, MCPs o hooks. Simplificar cuando coordinar
cueste más contexto que la tarea.

## ccusage

Activar ante pedidos de consumo, tendencia, budget o comparación de sesiones.
Opera como observador; nunca transforma contenido ni concede avance de gate.
[METODOLOGIA][CONFIG]

Leer solo logs locales autorizados. Separar tokens medidos, costo estimado y
factura real. Agregar por tarea, fase, actor y modelo sin persistir prompts o
PII. Comparar contra `BudgetEnvelope` y bloquear la siguiente invocación al hard
max sin afirmar enforcement retroactivo. Persistir únicamente agregados
sanitizados autorizados. Detener ante log no autorizado, pricing desconocido,
atribución ambigua o exposición de contenido privado.

## headroom

Activar solo cuando deferred read set, resumen estructurado y segmentación no
resuelvan la presión de ventana. El runtime permanece `shadow_quarantined`: la
skill gobierna evaluación, no habilita el proxy. [METODOLOGIA][CONFIG]

Conservar original y comprimido con hashes separados. Evaluar recuperación de
código, errores, citas, tags, estados y orden causal. Exigir equivalencia exacta
para evidencia y threshold aprobado para contexto auxiliar. Usar proceso local
efímero, sin proxy persistente, auto-MCP o egress. Ante benchmark fallido,
retornar original y apagar la ruta. No usar con Guardian, H01, fuente/derechos,
secretos, PII o payload no recuperable.
