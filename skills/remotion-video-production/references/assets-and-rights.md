# assets-and-rights

## Propósito

Resolver assets reproducibles y autorizados antes del render.

## Manifest mínimo

Registrar por asset: ID portable, archivo relativo, SHA-256, MIME, bytes, dimensiones o duración,
rights holder, rights basis, alcance permitido, fecha de evaluación y veredicto.

## Reglas

- Colocar assets autorizados en almacenamiento local gobernado.
- Resolverlos con `staticFile()` desde una ruta relativa.
- Prohibir URL remota y font descargada durante render.
- Rechazar symlinks, traversal, MIME discordante, SVG no confiable y archivos sobredimensionados.
- Conservar el raw; derivar optimizaciones como nuevos assets con lineage.
- Invalidar aprobación cuando cambia un asset o hash.
- Tratar “royalty free” como claim pendiente hasta registrar términos aplicables.
- No promover un asset con rights unknown.

Fuente técnica: https://www.remotion.dev/docs/staticfile
