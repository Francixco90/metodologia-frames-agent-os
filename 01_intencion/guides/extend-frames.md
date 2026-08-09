# Amplía Frames sin publicar nada

Usa extensiones locales cuando Frames todavía no reconoce una necesidad propia de tu proyecto: una nueva checklist, una skill especializada o un recorrido interno. La extensión queda privada, aparece después de las capacidades oficiales y no puede reemplazarlas en silencio.

## Empieza conversando

Puedes decir: «Crea una skill local para revisar mis fichas de producto». Frames identifica el resultado, pregunta como máximo tres datos y prepara el recorrido L00–L05. Antes de crear archivos se detiene en `LX_BRIEF_APPROVED`.

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

## Qué se activa

- Una extensión declarativa válida puede quedar `ACTIVE_LOCAL`.
- Una extensión con código queda `VALIDATED_NOT_RUNNABLE` hasta demostrar filesystem y procesos restringidos, red denegada, replay determinista y write set exacto.
- Un hash stale, symlink, dependencia ambigua, ID duplicado o colisión canónica bloquea.

Para convertir una extensión privada en capacidad oficial debes abrir un proceso H‑03 nuevo. Copiarla al repositorio no la promueve.

## Siguiente lectura

- [Recorridos L00–L05](../reference/workflows/index.md)
- [Mantener y evolucionar Frames](maintain-frames.md)
- [Referencia técnica](technical-reference.md)
