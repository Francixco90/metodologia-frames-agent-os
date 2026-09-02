#!/bin/sh
# Pre-commit hook — PII defense layer 3 (the only layer that blocks `git add -f`).
# Personal zones are loaded from .git/info/exclude (LOCAL, never versioned):
# the hook blocks any staged path that the local exclude already ignores.
# This keeps personal zone NAMES out of versioned files while still enforcing.
# Recreate after clone: scripts/recreate-git-hooks.sh
set -u

violations=$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null | while IFS= read -r path; do
  excluded=$(git check-ignore --no-index -q "$path" 2>/dev/null && echo yes || echo no)
  if [ "$excluded" = "yes" ]; then
    printf '%s\n' "$path"
  fi
done)

if [ -n "$violations" ]; then
  echo "PRE-COMMIT BLOCK: staged paths that the local exclude marks personal:" >&2
  echo "$violations" >&2
  echo "Si ES intencional y autorizado por el humano: commit --no-verify (documentalo en el receipt)." >&2
  exit 1
fi

exit 0
