case: El operador pide depurar un test fallido y el skill recorre las cuatro fases sin auto-ejecutar tests, mutar código ni commits.
context: Test fallido en un servicio de pagos, causa desconocida, no hay reproducción fiable aún.
request: >-
Depura este test de pagos que falla de forma intermitente. El ledger a
veces reporta un saldo distinto al esperado y no sé por qué.
expect:

- El skill recorre el defecto fase por fase y produce un diagnóstico en prosa.
- Investigar causa raíz: lee el mensaje de error y el stack trace completos; reproduce el fallo de forma fiable; revisa cambios recientes; instrumenta la frontera entre ledger y notificaciones para ver dónde se rompe; traza el valor defectuoso hacia atrás hasta su origen.
- Analizar patrón: encuentra un flujo de pago similar que sí funciona; lo lee completo; lista cada diferencia con el flujo roto; declara dependencias y supuestos de entorno.
- Formular y probar hipótesis: plantea "creo que la causa raíz es X porque Y"; propone la corrección mínima posible, una variable a la vez; declara el límite (qué falsaría la hipótesis).
- Implementar corrección: propone un caso de prueba que falle que captura la reproducción más simple; propone una única corrección de la causa raíz; declara cómo prevenir la regresión.
- El skill NO auto-arranca tests, git, mutaciones de código ni commits; entrega el diagnóstico y espera confirmación del operador.
