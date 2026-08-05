# charts-and-data-storytelling

## Propósito

Convertir datos gobernados en una secuencia comprensible sin alterar significado.

## Reglas

- Congelar dataset, query, unidad, denominador, fecha y exclusiones mediante digest.
- Mantener escala, dominio, baseline y orden explícitos.
- Derivar geometría como funciones puras del dataset y frame.
- Usar D3 solo para cálculo determinista; prohibir `.transition()`.
- Etiquetar unidades y valores relevantes; no depender solo de color.
- Mostrar incertidumbre, faltantes y truncamiento cuando sean materiales.
- Probar cero, negativos, outliers, series vacías, etiquetas largas y empates.
- Vincular cada takeaway a claim IDs soportados.

## Stop rule

Detener si no existe snapshot reproducible, si el gráfico cambia denominador o si la animación
oculta una limitación material.
