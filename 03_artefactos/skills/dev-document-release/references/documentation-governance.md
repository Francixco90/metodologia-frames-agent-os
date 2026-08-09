# Gobierno documental transversal

Clasifica el cambio como `CREATE`, `EXPAND`, `EXTEND`, `CORRECT`, `MIGRATE` o
`DEPRECATE`. Antes de iniciarlo debe existir `DocumentationImpactPlanV1`, con candidate,
write set y cada superficie marcada `REQUIRED` o `NOT_APPLICABLE`; esta última exige un
reason code verificable.

El cierre requiere `DocumentationClosureReceiptV1` ligado por hash al candidate congelado,
con fuentes, derivados, cobertura y validaciones aplicables sincronizados. Solo evidencia
del gate `DOCS_TRANSVERSAL_COMPLETE` permite declarar done. La skill prepara evidencia,
pero no autoaprueba el gate. Un cambio posterior al freeze crea un successor.
