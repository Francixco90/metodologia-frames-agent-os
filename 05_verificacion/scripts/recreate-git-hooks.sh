#!/bin/sh
# Recreate .git/hooks/pre-commit (PII defense layer 3) after a fresh clone.
# The hook lives only in .git/hooks (never versioned); this script reinstalls it
# from the versioned template so the protection travels with the repo.
set -eu
cd "$(dirname "$0")/../.."
root=$(git rev-parse --show-toplevel)
cd "$root"
install -m 755 05_verificacion/scripts/templates/pre-commit-pii.sh .git/hooks/pre-commit 2>/dev/null \
  || cp 05_verificacion/scripts/templates/pre-commit-pii.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
echo "pre-commit hook installed (.git/hooks/pre-commit)"
