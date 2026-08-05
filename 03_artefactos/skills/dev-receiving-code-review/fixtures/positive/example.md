case: El operador recibe feedback de revisión de código y el skill lo triagea en las cinco fases sin auto-aplicar, commitear ni empujar nada.
context: PR con comentarios de revisores externos, feedback técnico mezclado, algunos válidos, algunos inválidos, algunos poco claros.
request: >-
Atiende los comentarios de la revisión de este PR de pagos antes de tocar
nada. Hay un hilo de auth, dos sobre el ledger y uno pidiendo métricas con
base de datos y export CSV.
expect:

- El skill lee todo el feedback sin reaccionar y anota cada ítem sin juicios.
- Clasifica cada ítem con evidencia en válido, inválido o aclaración; cita archivo, línea o flujo que lo respalda; si no puede clasificarlo marca coverage_gap.
- Responde con razonamiento técnico: los válidos describen el cambio concreto (qué, dónde, por qué) sin acuerdo performative ni gratitud; los inválidos exponen la razón técnica del rechazo (rompe, falta contexto, YAGNI, incorrecto para el stack) y escalan al operador si es arquitectónico; las aclaraciones formulan la pregunta específica que falta.
- Aplica cambios solo sobre los válidos, en orden bloqueantes -> simples -> complejos, uno a la vez, testando cada uno, y solo tras confirmación explícita del operador.
- Verifica que no hay regresiones tras aplicar; si emitió pushback incorrecto, lo corrige de forma factual sin disculpa larga.
- El skill NO auto-aplica, NO commitea, NO empuja, NO arranca installs ni tests; entrega el triage y las respuestas en prosa y espera confirmación del operador.
