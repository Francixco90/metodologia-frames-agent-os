# Contrato de operación

## Roots

Proyecto usa `04_estado/local/extensions/`. Usuario usa el binding privado o `FRAMES_USER_EXTENSIONS_ROOT`; el locator nunca se versiona.

## Estados calculados

`DRAFT`, `VALIDATED`, `ACTIVE_LOCAL`, `VALIDATED_NOT_RUNNABLE`, `BLOCKED` y `RETIRED` los determina el loader. El manifest no autocertifica estado.

## Activación

Declarativos válidos pueden activarse. Código exige manifest exacto, content hashes, fixtures, runner confiable y probe material que demuestre filesystem contenido, proceso controlado, red denegada, replay igual y write set válido.

## Recuperación y promoción

Cambiar un byte invalida el receipt. Crear successor conserva el candidate anterior. Promoción pública reinicia documentación transversal, H-03, RT-09 y RT-11.
