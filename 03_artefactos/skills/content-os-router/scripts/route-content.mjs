#!/usr/bin/env node
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

import {hashContentRequestV1, normalizeContentRequest} from './content-intent-request.mjs';

const [inputArg, ...rest] = process.argv.slice(2);
if (!inputArg) {
  console.error('Usage: route-content.mjs <request.json> [--out <content-intent.json>]');
  process.exit(1);
}

const outFlag = rest.indexOf('--out');
const outputArg = outFlag >= 0 ? rest[outFlag + 1] : undefined;
const input = JSON.parse(readFileSync(resolve(inputArg), 'utf8'));
const normalize = normalizeContentRequest;
const request = normalize(input.request);
if (!request) throw new Error('CONTENT-INTENT-001 request is required');

const digest = hashContentRequestV1(request);
const source = input.source ?? {type: 'none', authority: 'unknown'};
const lower = request.toLocaleLowerCase('es');
const pieceClass =
  input.pieceClass ??
  (/editar|corregir|revisar/u.test(lower)
    ? 'intervention'
    : /campaña/u.test(lower)
      ? 'campaign'
      : /serie|carrusel/u.test(lower)
        ? 'series'
        : 'single');

const questions = [];
if (!normalize(input.audience)) questions.push('¿Para qué audiencia concreta es la pieza?');
if (!normalize(input.outcome)) questions.push('¿Qué resultado o acción debe producir?');
if (source.type === 'none' || source.authority === 'unknown') {
  questions.push('¿Qué fuente, material o afirmaciones debemos usar y con qué autoridad?');
}

const stages = [];
if (input.brandReady === false) stages.push('P00');
if (input.materialsAvailable === true) stages.push('P01');
if (input.evidenceSufficient === false) stages.push('P02');
if (pieceClass !== 'intervention') stages.push('P03');
if (pieceClass === 'campaign' || pieceClass === 'series') stages.push('P04');
if (pieceClass !== 'intervention') stages.push('P05');
if (input.assetsRequired === true) stages.push('P06');
stages.push('P07', 'P08');
if (input.distributionRequested === true) stages.push('P09');

const uniqueStages = [...new Set(stages)];
const nextGate = uniqueStages.includes('P03')
  ? 'MW_BRIEF_APPROVED'
  : uniqueStages.includes('P08')
    ? 'MW_EDIT_APPROVED'
    : 'G14';
const reasons = [pieceClass === 'intervention' ? 'EXISTING_PIECE' : 'NEW_PIECE'];
if (uniqueStages.includes('P00')) reasons.push('BRAND_REQUIRED');
if (uniqueStages.includes('P01')) reasons.push('MATERIALS_AVAILABLE');
if (uniqueStages.includes('P02')) reasons.push('EVIDENCE_INSUFFICIENT');
if (uniqueStages.includes('P04')) reasons.push('MULTI_PIECE');
if (uniqueStages.includes('P06')) reasons.push('ASSETS_REQUIRED');
if (uniqueStages.includes('P09')) reasons.push('DISTRIBUTION_REQUESTED');

const intent = {
  schema_version: 'content-intent-v2',
  request,
  request_hash: digest,
  content_class: pieceClass,
  audience: normalize(input.audience) || null,
  outcome: normalize(input.outcome) || null,
  sources: source.ref ? [String(source.ref)] : [],
  source_authority:
    source.authority === 'verified' ? 'verified' : source.authority === 'unknown' ? 'unknown' : 'partial',
  channels: Array.isArray(input.channels) ? [...new Set(input.channels)].sort() : [],
  restrictions: Array.isArray(input.constraints) ? [...new Set(input.constraints)].sort() : [],
  effect_class: normalize(input.effectClass) || 'local_reversible',
  brief_sufficiency: questions.length === 0 ? 'complete' : questions.length < 3 ? 'partial' : 'insufficient',
  blocking_questions: questions.slice(0, 3),
  route_candidates: [{route_id: 'R6_CONTENT', score: 1, reason_codes: reasons}],
  selected_stage_path: uniqueStages,
  brief_ref: normalize(input.briefRef) || 'work/content/brief.md',
  // The next gate is the first pending human decision in the selected path.
  // P09 may be planned, but distribution authorization remains a future gate
  // until the brief and candidate have passed their preceding decisions.
  next_gate: nextGate,
  decision: questions.length === 0 ? 'ROUTED' : 'NEEDS_INPUT',
};

const serialized = `${JSON.stringify(intent, null, 2)}\n`;
if (outputArg) {
  const output = resolve(outputArg);
  mkdirSync(dirname(output), {recursive: true});
  writeFileSync(output, serialized, 'utf8');
} else {
  process.stdout.write(serialized);
}
