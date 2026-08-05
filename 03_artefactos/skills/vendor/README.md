# skills/vendor/ — Zona de aislamiento de fuentes externas auditadas
#
# Este directorio contiene copias de referencia de skills externas.
# Los vendors NO son dependencias obligatorias del harness.
# Los vendors NO se ejecutan automáticamente.
# Los vendors NO sobrescriben las skills propias en skills/<name>/.
#
# Para actualizar un vendor:
#   1. Re-auditar la nueva versión (ver docs/scroll-skills/audit-*.md)
#   2. Actualizar el commit en docs/scroll-skills/source-lock.json
#   3. Recalcular hashes de archivos críticos
#   4. Copiar solo archivos de texto (nunca binarios ni instaladores)
#
# No se incluyen:
#   - binarios (.mp4, .png, .webp, .gif, .glb, .wasm)
#   - instaladores (bin/install.mjs)
#   - templates completos de framework (templates/nextjs/)
#   - node_modules
