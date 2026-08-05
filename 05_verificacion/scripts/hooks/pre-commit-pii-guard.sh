#!/usr/bin/env bash
# Pre-commit hook: PII protection layer 3
# Blocks commits that add non-placeholder files to PII-regulated inbox folders.
# .gitignore blocks git add -A; this hook blocks git add -f.
set -euo pipefail

PII_EXT='docx|doc|pdf|png|jpe?g|gif|bmp|xlsx|csv'

for dir in inbox/Contratos inbox/Firmas inbox/Muestras; do
  if [ -d "$dir" ]; then
    leaked=$(git diff --cached --name-only --diff-filter=ACM -- "$dir/" \
             | grep -ivE '\.gitkeep$|README\.md$' \
             | grep -iE "\.(${PII_EXT})$" || true)
    if [ -n "$leaked" ]; then
      echo "COMMIT ABORTADO: posible PII en $dir:" >&2
      echo "$leaked" >&2
      echo "Si es legitimo, usa 'git commit --no-verify' y registra el incidente." >&2
      exit 1
    fi
  fi
done
