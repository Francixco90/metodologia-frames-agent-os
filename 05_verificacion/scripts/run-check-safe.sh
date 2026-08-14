#!/bin/sh
# Canonical entrypoint when the parent process is not trusted. [CONFIG]
# This cannot undo code that the invoking parent already executed.
unset NODE_OPTIONS BASH_ENV ENV
if [ "${1-}" = "--" ]; then
  shift
fi
exec node --import tsx scripts/run-check.ts "$@"
