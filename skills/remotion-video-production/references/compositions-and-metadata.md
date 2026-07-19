# compositions-and-metadata

## Propósito

Crear composiciones con props Zod 4 y metadatos reproducibles.

## Patrón

Definir un schema único y exportar su tipo:

```ts
import type {CalculateMetadataFunction} from 'remotion';
import {z} from 'zod';

export const propsSchema = z.object({
  sourceSnapshotId: z.string().min(1),
  durationInFrames: z.number().int().positive(),
});

type Props = z.infer<typeof propsSchema>;

export const calculateMetadata: CalculateMetadataFunction<Props> = ({props}) => {
  const parsed = propsSchema.parse(props);
  return {
    durationInFrames: parsed.durationInFrames,
    props: parsed,
  };
};
```

## Reglas

- Fijar Zod major 4 y Remotion 4.0.494.
- Mantener metadatos JSON-serializables.
- Usar `abortSignal` para trabajo async permitido y respetar timeouts.
- No leer red, reloj, timezone, estado global o paths privados.
- Validar `width`, `height`, `fps` y `durationInFrames` como enteros positivos.
- Mantener defaults mínimos; no ocultar decisiones editoriales en `defaultProps`.
- Generar JSON Schema desde una fuente de verdad o validar paridad explícitamente.

Fuentes técnicas:

- https://www.remotion.dev/docs/calculate-metadata
- https://www.remotion.dev/docs/parameterized-rendering
