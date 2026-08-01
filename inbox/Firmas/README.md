# ZONA REGULADA - DATOS PERSONALES

Esta carpeta contiene/apuntara a firmas manuscritas (PII biometrica).

NO COMMITEAR ARCHIVOS DE ESTA CARPETA

El .gitignore bloquea git add -A, PERO git add -f <archivo> lo bypassa.
Si necesitas referenciar un archivo aqui:
1. NO lo anadas a git.
2. Registra su hash en registries/sources/ como locator privado.
3. Manten los bytes fuera del control de versiones.

Cualquier commit accidental de PII requiere purge del historial
con git filter-repo + notificacion de incidente.
