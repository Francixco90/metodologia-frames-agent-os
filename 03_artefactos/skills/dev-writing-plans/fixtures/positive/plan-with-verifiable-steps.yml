case: El operador entrega una spec para una feature multi-paso y el skill produce un plan de implementación con pasos verificables, criterio de aceptación por paso y riesgos identificados, sin auto-ejecutar git, tests ni installs.
context: Spec de una feature de pagos con autenticación, ledger y notificaciones; el operador quiere el plan antes de tocar código.
request: >-
Escribe un plan de implementación para añadir reembolsos al servicio de pagos.
La spec pide un endpoint de reembolso, validación de autoridad, escritura en el
ledger y notificación al cliente.
expect:

- El skill recorre el plan fase por fase y produce un plan en prosa estructurada.
- Alcance: acota a reembolsos; declara fronteras y confirma que es un solo subsistema.
- Estructura de archivos: mapea archivos a crear y modificar; una responsabilidad por archivo; sigue patrones existentes.
- Descomposición: divide en tareas de tamaño correcto; cada tarea termina con un entregable testeable; cada paso es una sola acción con su criterio de aceptación verificable.
- Criterio por paso: cada paso lleva comando, salida esperada y aserción; sin placeholders; el código del test aparece, no se referencia.
- Riesgos: identifica dependencias entre tareas, tipos que cambian, requisitos sin tarea; auto-revisa cobertura, placeholders y consistencia de tipos antes de cerrar.
- El skill NO auto-arranca git, tests, installs ni commits; entrega el plan y espera confirmación del operador.
