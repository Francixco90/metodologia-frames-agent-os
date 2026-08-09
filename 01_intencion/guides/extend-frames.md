# Amplía Frames sin publicar nada

Usa extensiones locales cuando Frames todavía no reconoce una necesidad propia de tu proyecto: una nueva checklist, una skill especializada o un recorrido interno. La extensión queda privada, aparece después de las capacidades oficiales y no puede reemplazarlas en silencio.

## Empieza conversando

Puedes decir: «Crea una skill local para revisar mis fichas de producto». Frames identifica el resultado, pregunta como máximo tres datos y prepara el recorrido L00–L05. Antes de crear archivos se detiene en `LX_BRIEF_APPROVED`.

No toda necesidad merece una skill. Frames comprueba primero si basta una instrucción clara, una referencia reutilizable, una herramienta existente o una mejora de una capacidad actual. Esto evita llenar el sistema de piezas duplicadas que después nadie mantiene.

## Empieza con el comando

1. Prepara un JSON con `request`, `extension_kind`, `scope`, `desired_capability` y un ID como `local.mi-equipo.fichas`.
2. Ejecuta el modo de vista previa; no escribe archivos:

   ```sh
   pnpm frames:extend -- < solicitud.json
   ```

3. Revisa el hash y el brief. Solo después de aprobar esa versión ejecuta:

   ```sh
   pnpm frames:extend -- --apply --approval-hash HASH < solicitud.json
   ```

4. Frames crea documentación, secuencia, fixtures, manifest y receipt en el espacio local ignorado.

## Diseña y comprueba una skill

Cuando la necesidad es repetible y requiere criterio especializado, Frames usa el recorrido S00–S09 dentro de R8 para una skill privada o R9 para una capacidad canónica. No necesitas memorizar esos códigos: describen una secuencia estable de diseño, autoría, validación, evaluación y versión.

Antes de escribir, prepara un bundle material con las referencias y hashes que
correspondan al gate. Los comandos sin bundle responden `UNKNOWN`; esto evita que
una comprobación vacía parezca aprobada.

```sh
pnpm skills:inspect -- --input work/private/skills/case-bundle.json
pnpm skills:validate -- --input work/private/skills/static-bundle.json
pnpm skills:evaluate -- --input work/private/skills/eval-bundle.json
```

- `inspect` produce el caso de uso y ayuda a decidir si crear, ampliar, dividir, fusionar o no crear la skill.
- `validate` revisa contratos, rutas, referencias, efectos, fixtures y supply chain.
- `evaluate` compara el candidate contra no usar skill o contra la versión anterior; los fallos de infraestructura no cuentan como éxito ni como fracaso del candidate.
- `scaffold` y `package` funcionan en vista previa. Para escribir exigen un WorkOrder, un gate aprobado y un write set exacto.

El resultado no se declara compatible con Codex, Claude, Gemini o ChatGPT por tener una carpeta o un archivo de configuración. Cada host permanece `UNKNOWN` hasta contar con una prueba de comportamiento material. La portabilidad del contrato se valida por separado.

## Qué se activa

- Una extensión declarativa válida puede quedar `ACTIVE_LOCAL`.
- Una extensión con código queda `VALIDATED_NOT_RUNNABLE` hasta demostrar filesystem y procesos restringidos, red denegada, replay determinista y write set exacto.
- Un hash stale, symlink, dependencia ambigua, ID duplicado o colisión canónica bloquea.

Para convertir una extensión privada en capacidad oficial debes abrir un proceso H‑03 nuevo. Copiarla al repositorio no la promueve.

Si el trabajo incluye diseño creativo, prompts, assets, scripts o templates, consulta
la [guía de sistemas de skills](skill-systems.md): explica cómo aplicar un segundo
oráculo multimedia sin duplicar responsabilidades ni conceder autoridad extra.

## Siguiente lectura

- [Recorridos L00–L05](../reference/workflows/index.md)
- [Mantener y evolucionar Frames](maintain-frames.md)
- [Referencia técnica](technical-reference.md)
