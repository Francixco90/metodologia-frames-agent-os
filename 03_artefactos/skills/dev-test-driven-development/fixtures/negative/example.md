case: El agente escribe la implementacion antes que el test, o salta el paso de ver el test fallar.
context: El operador pidio implementar el validador de email, el agente interpreta "ya se lo que hace" como permiso para escribir codigo primero y bolear tests despues.
request: >-
Agrega un validador de email que rechace string vacio.
violation: >
El agente escribe la implementacion del validador directamente — la guarda
de vacio, el mensaje de error, el retorno temprano — y despues le agrega un
test que pasa de inmediato porque la feature ya esta implementada. Esto
rompe la ley de hierro ("NINGUN codigo de produccion sin un test fallido
primero") y el modo fail-closed ("NO auto-ejecuta tests que muten estado;
el skill propone el test, el operador lo corre"). Un test que nunca se vio
fallar no prueba nada: esta sesgado por el codigo que ya se escribio y podria
probar el caso equivocado, la implementacion en lugar del comportamiento, o
perder el caso limite que se olvido. El referenciador superpowers tenia
hooks y gates automaticos que se descartaron; el homologo delega toda
ejecucion al operador. "Lo pruebo despues" no es TDD — es cobertura sin
prueba de que los tests funcionan.
expect_reject:

- El skill se niega a escribir implementacion antes que el test fallido.
- El skill propone el test fallido primero y se detiene a esperar verificacion del rojo por el operador.
- Todo codigo de produccion se escribe solo despues de que el test fallo de la forma esperada (rojo verificado).
- Toda ejecucion de tests (rojo, verde) queda detras de confirmacion explicita del operador (fail-closed).
- Si falta contexto para declarar el comportamiento esperado, el skill emite coverage_gap en lugar de fabricar un test generico o implementar a ciegas.
