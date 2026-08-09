# Política de UX Writing para documentación

## Propósito

La documentación debe ayudar a una persona a decidir, empezar y avanzar. La precisión técnica se conserva, pero aparece después de explicar la utilidad. Un lector no necesita conocer rutas, gates o receipts para descubrir que Frames puede ayudarle con un CV, una campaña o un carrusel.

## Orden de lectura

Todo documento explicativo responde, según aplique, en este orden:

1. **Qué puedes lograr:** resultado observable para la persona.
2. **Para qué sirve:** decisión, problema o esfuerzo que reduce.
3. **Cómo funciona:** pasos visibles y responsabilidades.
4. **Qué recibirás:** entregables concretos y su estado.
5. **Cómo empezar:** lenguaje normal primero; comando equivalente después.
6. **Qué necesita de ti:** datos y aprobaciones realmente bloqueantes.
7. **Qué no hace:** límites, riesgos y capacidades todavía no probadas.
8. **Detalle técnico:** rutas, schemas, gates y verificadores bajo demanda.

## Voz y microcopy

- Hablar en segunda persona y usar verbos de resultado: crear, mejorar, comparar, decidir, revisar.
- Traducir cada término interno la primera vez: `brief` es el acuerdo de trabajo; un `gate` es una aprobación o control que impide avanzar sin evidencia.
- Evitar abrir con arquitectura, estado interno, acrónimos o inventarios de carpetas.
- Recomendar una acción; ofrecer como máximo dos alternativas contextuales.
- Mostrar ejemplos con frases que una persona diría, no con IDs internos.
- Diferenciar **disponible**, **asistido**, **preparado** y **no habilitado**. No convertir templates, YAML o tests en capacidad ejecutada.
- Explicar los límites cerca de la promesa afectada, no solo al final.

## Progressive disclosure

El README presenta valor, recorridos y entrada rápida. Las guías profundizan por necesidad. La referencia técnica conserva contratos y comandos. Gobierno, evidencia y archivos históricos no se reescriben como material comercial.

## Exención controlada

Solo los paths enumerados en `user-facing-docs.yml` están exentos de límites de palabras y líneas. La exención permite explicar mejor; no autoriza duplicación, marketing inflado ni ampliar el hard cap del PR. El checker exige paridad exacta entre ese registro y la regla presupuestaria.

## Criterio de aceptación

Una persona no técnica debe poder identificar un uso relevante, comprender el recorrido, saber qué recibirá, iniciar con una frase normal y reconocer dónde se requiere su aprobación. Un operador técnico debe poder llegar desde el mismo documento a la referencia ejecutable sin encontrar promesas incompatibles.
