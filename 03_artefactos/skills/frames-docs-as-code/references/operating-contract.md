# Contrato de operación

## Entrada mínima

Fuente canónica, candidate hash, `DocumentationImpactPlanV1`, write set y superficies afectadas.

## Paridad

Markdown, HTML, secuencia e inventario deben derivar del mismo modelo. La presentación puede variar; actores, pasos, gates, outputs y significado no.

## Freshness y cierre

Recalcular referencias y hashes después de generar. Dos ejecuciones offline deben producir bytes idénticos. Un enlace muerto, página ausente, diferencia semántica, dato privado o `NOT_APPLICABLE` sin reason code produce `BLOCKED`.

## Recuperación

Preservar la fuente y el último candidate válido. Corregir el generador o manifest y crear successor; nunca parchear el HTML o índice como fuente.
