#!/bin/sh
# Pre-commit hook — PII defense layer 3 (the only layer that blocks `git add -f`).
# Blocks any staged path under personal zones (00_inbox personal subdirs, work/private
# certificates, brand WIP) regardless of how it was staged.
# Recreate after clone: scripts/recreate-git-hooks.sh
set -u

PERSONAL_PATTERNS='^00_inbox/Asistentes a workshops/
^00_inbox/CV/
^00_inbox/Campaña para redes sociales/
^00_inbox/Workshops gratuitos/
^00_inbox/Firmas/firma
^inbox/Asistentes a workshops/
^inbox/CV/
^inbox/Campaña para redes sociales/
^inbox/Workshops gratuitos/
^inbox/Firmas/firma
^work/private/
^03_artefactos/work/private/
^projects/metodologia-social-9d3v-001/
^projects/metodologia-social-9d3v-001/'

violations=$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null | grep -E "$PERSONAL_PATTERNS")

if [ -n "$violations" ]; then
  echo "PRE-COMMIT BLOCK: rutas personales/privadas en el staged area:" >&2
  echo "$violations" >&2
  echo "Si ES intencional y autorizado por el humano: commit --no-verify (documentalo en el receipt)." >&2
  exit 1
fi

exit 0
