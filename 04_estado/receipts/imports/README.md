# Receipts de importación

Cada archivo es un evento inmutable y append-only. Corregir un receipt mediante un nuevo evento que
declare `supersedes`; nunca editar, reutilizar un `receipt_id` ni borrar historia.

Un receipt vincula la transición a hashes o, para una referencia remota aún no ingerida, registra
explícitamente que los hashes de contenido están ausentes y que la promoción permanece bloqueada.
