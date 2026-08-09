#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const normalize = (value) =>
  String(value ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/gu, ' ');

const careerSignals =
  /\b(cv|curriculum|r[ée]sum[ée]|hoja de vida|cover letter|carta de presentaci[oó]n|vacante|empleo|linkedin|postular|candidatura)\b/iu;
const contentSignals =
  /\b(pieza|contenido|campa[nñ]a|carrusel|historia|video|multimedia|publicaci[oó]n)\b/iu;

export const routeIntent = (input) => {
  const request = normalize(input.request);
  if (!request) throw new Error('INTENT-DISPATCH-001 request is required');
  const explicitDomain = normalize(input.intent_domain).toLowerCase();
  const career = explicitDomain === 'career' || careerSignals.test(request);
  const content = explicitDomain === 'content' || contentSignals.test(request);
  const ambiguous = (career && content) || (!career && !content);
  const route_id = ambiguous ? 'R0' : career ? 'R7' : 'R6';
  return {
    schema_version: 'frames-route-decision-v1',
    request_hash: createHash('sha256').update(request, 'utf8').digest('hex'),
    route_id,
    adapter:
      route_id === 'R7'
        ? 'career-application-orchestrator/scripts/route-career.mjs'
        : route_id === 'R6'
          ? 'content-os-router/scripts/route-content.mjs'
          : null,
    next_gate: route_id === 'R7' ? 'CR_BRIEF_APPROVED' : route_id === 'R6' ? 'MW_BRIEF_APPROVED' : 'R0',
    decision: ambiguous ? 'NEEDS_INPUT' : 'ROUTED',
  };
};

const invoked = process.argv[1]?.endsWith('route-intent.mjs');
if (invoked) {
  const inputPath = process.argv[2];
  if (!inputPath) throw new Error('Usage: route-intent.mjs <request.json>');
  const input = JSON.parse(readFileSync(resolve(inputPath), 'utf8'));
  process.stdout.write(`${JSON.stringify(routeIntent(input), null, 2)}\n`);
}
