# Adopción evolutiva de Frames v1

## Decisión

Frames incorpora un núcleo operativo compartido para Career OS y Video OS. El
nuevo núcleo no reemplaza sus workflows: estandariza intención, continuidad,
unidades de trabajo, recursos, identidad de artefactos, aceptación y medición.
[METODOLOGIA]

Trainer OS está fuera de este cambio porque se genera y gobierna en otro flujo.
No se añade como perfil, dependencia, fixture ni target de verificación. [CONFIG]

## Qué se adopta ahora

1. Cuatro checkpoints humanos predeterminados y un quinto giro correctivo
   opcional; las preguntas bloqueantes siguen limitadas a tres. [METODOLOGIA]
2. Una cápsula de sesión acotada a 1.800 tokens estimados y referencias
   hash-bound, para reanudar sin reinyectar todo el historial. [METODOLOGIA]
3. Una única unidad semántica activa, write-set explícito, checkpoint, máximo dos
   intentos y dependencias verificadas. [CONFIG]
4. Perfil `safe-laptop`: un proceso pesado, uno liviano y un navegador; 30 % de
   reserva y pares de recursos incompatibles. [CONFIG]
5. Separación estricta entre candidato técnico, verificación y aceptación humana.
   `RENDERED_DRAFT` no equivale a `HUMAN_ACCEPTED`. [CONFIG]
6. Identidad de artefacto con hashes de fuentes, spec, build y manifest. Cambiar
   cualquiera invalida receipts posteriores. [METODOLOGIA]
7. Un receipt de eficiencia que solo permite afirmar reducción cuando existe
   baseline medido. El objetivo de 50 % queda como hipótesis de benchmark.
   [INFERENCIA]

## Lo que no se afirma

- No se afirma todavía que Luna 5.6 low alcance paridad con Sol 5.6 high.
- No se afirma todavía una reducción de 50 % de tokens o turnos.
- No se promueve ni publica ningún output.
- No se modifica Trainer OS.

## Secuencia incremental

`Baseline → Operator Core → Career adapter → Video adapter → Replays → Benchmark`

Este cambio materializa `Operator Core` y enlaza las rutas R6/R7. Los adapters
profundos y el benchmark con ejecuciones reales quedan como incrementos
posteriores para evitar una migración monolítica. [METODOLOGIA]

## Criterios de éxito del incremento

- Contratos públicos validados por tipos y pruebas negativas.
- Máximo una unidad activa y recursos seguros comprobados.
- Derivados de Video OS bloqueados antes del PASS principal.
- Aceptación humana imposible de fabricar mediante transición automática.
- Target de eficiencia imposible de declarar como logrado sin medición.
- Career OS y Video OS presentes; Trainer OS ausente.
