# Contrato de operación

## Clases y DoD

Todo CREATE, EXPAND, EXTEND, CORRECT, MIGRATE o DEPRECATE debe declarar impacto documental antes de editar. Una corrección interna puede omitir guía humana solo con reason code, pero nunca pruebas, inventario y receipt.

## Candidate y revisión

El producer congela hashes y diff contra write set. RT-09 verifica el candidate sin editar; RT-11 revisa gobierno. Una remediación crea successor y preserva evidencia fallida.

## Stop rules

Bloquear ante ownership ambiguo, autoridad ausente, hard max superado, dato privado, dependencia no aprobada, test rojo, hash stale, UNKNOWN o documentación transversal incompleta.

## Promoción

Commit, push, merge, despliegue y publicación son efectos distintos. Ningún gate técnico concede el siguiente automáticamente.
