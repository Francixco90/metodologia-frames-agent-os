#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {routeCareerIntent} from '../../../../02_proceso/workflows/career/_runner/route-career.ts';

export {routeCareerIntent};

if (process.argv[1]?.endsWith('route-career.mjs')) {
  const inputPath = process.argv[2];
  if (!inputPath) throw new Error('Usage: route-career.mjs <request.json>');
  const input = JSON.parse(readFileSync(resolve(inputPath), 'utf8'));
  process.stdout.write(`${JSON.stringify(routeCareerIntent(input), null, 2)}\n`);
}
