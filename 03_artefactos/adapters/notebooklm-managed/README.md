# notebooklm-managed-v1

Adaptador gobernado para operaciones allowlisted. En este repositorio opera en
`validate_only`: valida planes, gates e idempotencia, pero la ejecución contra un proveedor
requiere un binding privado de sesión, autorización separada y receipt con readback.

No sustituye ni modifica `notebooklm-grounding-readonly-v1`.
