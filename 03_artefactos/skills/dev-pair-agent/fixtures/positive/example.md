case: El operador y el agente hacen pair programming en turnos de conductor/navegador con handoff explícito, contexto compartido y bucle de revisión, sin auto-ejecutar git, tests ni commits.
context: Feature nueva en un repo existente, operador y agente comparten el teclado, objetivo declarado para el turno.
request: >-
Programemos juntos la validación de la entrada del endpoint de pagos.
Yo conduzco primero, tú navegas. Intercambiamos cada función que cerremos.
expect:

- El par declara el contexto compartido: archivo del endpoint, objetivo (validación de entrada), restricciones, done del turno.
- El operador conduce primero: declara la intención (qué va a tocar, por qué) antes de escribir.
- El agente navega: pregunta, propone, señala bordes (null, vacío, timeout) y conecta con contexto que el conductor no tiene a la vista.
- Al cerrar la unidad de intención, el conductor hace handoff explícito ("paso el teclado") y el navegador acepta.
- El bucle de revisión corre: el navegador responde "listo", "ajusta X" o "coverage_gap en Y" antes de avanzar.
- El skill NO auto-arranca git, tests, installs ni commits; toda acción irreversible queda detrás de confirmación explícita del operador.
