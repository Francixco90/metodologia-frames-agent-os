#!/bin/bash
set -e

pnpm vitest run \
  05_verificacion/tests/unit/video-os-planner-docs.test.ts \
  05_verificacion/tests/unit/video-os-state-gates.test.ts
pnpm typecheck
