# Usar Frames conversando o con comandos

La forma recomendada de trabajar es describir el resultado. Frames traduce esa intención en un recorrido profesional y deja visibles las decisiones importantes.

## Empieza con una frase normal

Buenos puntos de partida:

- “Ayúdame a explicar esta investigación con un carrusel.”
- “Necesito una presentación ejecutiva para decidir entre estas alternativas.”
- “Crea una campaña de lanzamiento con parrilla y cronograma.”
- “Adapta mi CV a esta vacante usando solo evidencia comprobable.”
- “Compara estas oportunidades y dime cuáles priorizar.”

Si dices solo “hola”, Frames muestra **Crear · Mejorar · Planear · Explorar**. Si ya expresaste un resultado, no interrumpe con un menú genérico.

## Recorrido conversacional

1. **Confirmación:** “Entendí que quieres…” te permite corregir la dirección pronto.
2. **Preguntas:** hasta tres por ronda, solo cuando la respuesta cambia el brief o la ruta.
3. **Brief:** revisas el objetivo, entregables, evidencia, límites y plan.
4. **Aprobación:** decides avanzar, ajustar o inspeccionar la ruta.
5. **Hitos:** Frames muestra qué terminó y recomienda la siguiente acción.
6. **Recuperación:** si algo falla, conserva lo válido y explica qué evidencia falta.

Puedes cambiar de dirección con texto libre. La versión candidata anterior no se sobrescribe: un cambio estructural crea una sucesora.

## Recorrido por comandos

### Inspeccionar sin escribir

```bash
printf '%s\n' 'Ayúdame a crear una pieza' | pnpm frames:assist
printf '%s\n' '/menu' | pnpm frames:assist
printf '%s\n' '/ruta Quiero mejorar mi CV' | pnpm frames:assist
```

La respuesta incluye lo entendido, ruta, recorrido previsto, preguntas bloqueantes y siguiente aprobación. Este modo no materializa archivos.

### Materializar un brief local

`--apply` requiere un JSON con intake suficiente, timestamps explícitos y un `workspace_root` autorizado. El input debe ser relativo al repositorio y no puede atravesar symlinks.

```bash
pnpm frames:assist -- --input work/private/request.json --apply
```

El resultado esperado es `AWAITING_APPROVAL`: acuerdo de trabajo en Markdown, proyección HTML y comprobante verificable. No continúa automáticamente a publicación o envío.

### Verificar el sistema

```bash
pnpm verify:instructions
pnpm verify:multimedia
pnpm verify:skills
pnpm verify
```

La verificación completa es para operadores del repositorio; no es necesaria para conversar con Frames.

## Cómo retomar

Una reanudación válida necesita el `candidate_id` y el lineage material guardado en el state root autorizado. Frames verifica hashes y artefactos antes de ofrecer continuar. Si encuentra cero candidatos pide orientación; si encuentra varios no elige arbitrariamente.

Opciones habituales: **Continuar · Inspeccionar · Crear successor**.

## Cuándo detenerte

Detén el recorrido si el sistema solicita credenciales, propone publicar sin aprobación, transforma un supuesto en hecho o declara un output que no existe. Esas situaciones deben producir `BLOCKED`, no una confirmación optimista.
