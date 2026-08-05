# Protocolo de comité creativo

Este módulo aplica ADR-009 y ADR-010: todo output material se decide mediante
exactamente cinco propuestas conceptuales independientes, no cinco
implementaciones completas. [CONFIG]

## Flujo

1. Cinco actores de roles distintos entregan propuestas cerradas con supuestos,
   evidencia, riesgos, criterios y trade-offs.
2. Cada actor revisa y puntúa, con la misma rúbrica, las otras cuatro propuestas.
   El expediente contiene exactamente veinte evaluaciones cruzadas.
3. La síntesis selecciona una propuesta con score máximo, dispone las cuatro
   alternativas e incorpora al menos un elemento compatible de una alternativa.
4. La disidencia se registra o se declara explícitamente que no hubo disidencia.
5. La incertidumbre se clasifica por impacto y resolubilidad analítica.
6. Solo se abre un segundo prototipo si la incertidumbre es material y existe al
   menos un driver que el análisis no puede resolver.

## Trazabilidad permitida

Se conservan propuestas, evidencia, supuestos, scores, preguntas socráticas,
objeciones, decisiones, cambios, dissent y lineage. [DOC]

No se solicitan ni persisten razonamientos privados o chain-of-thought. Los
schemas son cerrados y rechazan campos no declarados. [CONFIG]

## API

- `CommitteeSessionSchema`: contrato fail-closed del expediente.
- `adjudicateCommittee(input)`: valida, calcula el ranking y produce la decisión.
- `CommitteeDecisionSchema`: salida portable y sin autoridad de release.
- `AgentContractSchema`: valida los contratos operativos RT-01 a RT-11; RT-11
  permanece fuera de los roles productores del comité.

La decisión del comité no concede `HUMAN_APPROVED`, `READY` ni `PUBLISHED`.
[CONFIG]
