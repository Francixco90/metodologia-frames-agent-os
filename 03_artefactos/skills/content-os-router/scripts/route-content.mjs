#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

import {hashContentRequestV1, normalizeContentRequest} from './content-intent-request.mjs';

const normalize = normalizeContentRequest;
const COMMERCIAL_PROPOSAL_SIGNALS = [
  'propuesta comercial',
  'commercial proposal',
  'proposal deck',
];
const SHA256 = /^[a-f0-9]{64}$/u;
const PORTABLE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const RECORDED_AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u;
const VOLATILE_HASH_KEYS = new Set([
  'canonicalSha256',
  'createdAt',
  'updatedAt',
  'startedAt',
  'completedAt',
  'durationMs',
]);
const exactKeys = (value, expected) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).sort().join('\u0000') === [...expected].sort().join('\u0000');
const canonicalize = (value) => {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('NON_JSON_NUMBER');
    return Object.is(value, -0) ? '0' : String(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .filter(([key]) => !VOLATILE_HASH_KEYS.has(key))
      .sort(([left], [right]) => (left === right ? 0 : left < right ? -1 : 1))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`)
      .join(',')}}`;
  }
  throw new Error('NON_JSON_VALUE');
};
const hashExperienceValue = (value) =>
  createHash('sha256').update(canonicalize(value), 'utf8').digest('hex');
const parseCommercialSource = (rawSource) => {
  const source = {
    source_id: rawSource?.source_id ?? rawSource?.id,
    ref: rawSource?.ref,
    sha256: rawSource?.sha256,
    authority: rawSource?.authority,
    rights: rawSource?.rights,
  };
  return (
      typeof source.source_id === 'string' && source.source_id.length >= 1 && source.source_id.length <= 120 &&
      typeof source.ref === 'string' && source.ref.length >= 1 && source.ref.length <= 500 &&
      typeof source.sha256 === 'string' && SHA256.test(source.sha256) &&
      source.authority === 'user_assertion' && source.rights === 'restricted'
    ) ? source : null;
};
const validCommercialReceipt = (receipt, source) => {
  if (!exactKeys(receipt, [
    'schemaVersion', 'receiptId', 'source', 'authorityMode', 'authorityActorId',
    'rightsBasis', 'allowedUseScope', 'restrictions', 'recordedAt', 'canonicalSha256',
  ])) return false;
  if (!exactKeys(receipt.source, ['source_id', 'ref', 'sha256', 'authority', 'rights'])) return false;
  const restrictions = receipt.restrictions;
  return (
    receipt.schemaVersion === 'brief-source-authority-receipt-v1' &&
    typeof receipt.receiptId === 'string' && receipt.receiptId.length >= 3 &&
    receipt.receiptId.length <= 160 && PORTABLE_ID.test(receipt.receiptId) &&
    receipt.authorityMode === 'LOCAL_SIMULATION' &&
    receipt.authorityActorId === 'LOCAL-USER-ASSERTION' &&
    receipt.rightsBasis === 'user_supplied_for_local_brief' &&
    receipt.allowedUseScope === 'local_internal_brief_only' &&
    Array.isArray(restrictions) && restrictions.length === 2 &&
    new Set(restrictions).size === 2 &&
    restrictions.includes('no_external_distribution') &&
    restrictions.includes('no_claim_promotion') &&
    typeof receipt.recordedAt === 'string' && RECORDED_AT.test(receipt.recordedAt) &&
    Number.isFinite(Date.parse(receipt.recordedAt)) &&
    typeof receipt.canonicalSha256 === 'string' && SHA256.test(receipt.canonicalSha256) &&
    exactKeys(source, ['source_id', 'ref', 'sha256', 'authority', 'rights']) &&
    Object.keys(source).every((key) => receipt.source[key] === source[key]) &&
    hashExperienceValue(receipt) === receipt.canonicalSha256
  );
};
const assessCommercialSource = (rawSource, rawReceipt) => {
  const source = parseCommercialSource(rawSource);
  const valid = source !== null && validCommercialReceipt(rawReceipt, source);
  return valid ? {valid: true, source} : {valid: false, source: null};
};

export const routeContentIntent = (input) => {
  const request = normalize(input.request);
  if (!request) throw new Error('CONTENT-INTENT-001 request is required');
  const source = input.source ?? {type: 'none', authority: 'unknown'};
  const lower = request.toLocaleLowerCase('es');
  const commercialProposal = COMMERCIAL_PROPOSAL_SIGNALS.some((signal) => lower.includes(signal));
  const commercialSource = commercialProposal
    ? assessCommercialSource(source, input.sourceAuthorityReceipt)
    : null;
  const pieceClass =
    commercialProposal
      ? 'commercial-proposal'
      : (input.pieceClass ??
        (/editar|corregir|revisar/u.test(lower)
          ? 'intervention'
          : /campaña/u.test(lower)
            ? 'campaign'
            : /serie|carrusel/u.test(lower)
              ? 'series'
              : 'single'));
  const questions = [];
  if (!normalize(input.audience)) questions.push('¿Para qué audiencia concreta es la pieza?');
  if (!normalize(input.outcome)) questions.push('¿Qué resultado o acción debe producir?');
  if (
    commercialProposal ? !commercialSource.valid : source.type === 'none' || source.authority === 'unknown'
  ) {
    questions.push('¿Qué fuente, material o afirmaciones debemos usar y con qué autoridad?');
  }
  const stages = [];
  if (commercialProposal) {
    if (!commercialSource.valid) stages.push('P01');
    else {
      if (input.brandReady === false) stages.push('P00');
      stages.push('P01', 'P02', 'P03', 'P05', 'P06', 'P07');
    }
  } else {
    if (input.brandReady === false) stages.push('P00');
    if (input.materialsAvailable === true) stages.push('P01');
    if (input.evidenceSufficient === false) stages.push('P02');
    if (pieceClass !== 'intervention') stages.push('P03');
    if (pieceClass === 'campaign' || pieceClass === 'series') stages.push('P04');
    if (pieceClass !== 'intervention') stages.push('P05');
    if (input.assetsRequired === true) stages.push('P06');
    stages.push('P07', 'P08');
    if (input.distributionRequested === true) stages.push('P09');
  }
  const selected = [...new Set(stages)];
  const reasons = [
    commercialProposal
      ? 'COMMERCIAL_PROPOSAL'
      : pieceClass === 'intervention'
        ? 'EXISTING_PIECE'
        : 'NEW_PIECE',
  ];
  if (selected.includes('P00')) reasons.push('BRAND_REQUIRED');
  if (!commercialProposal && selected.includes('P01')) reasons.push('MATERIALS_AVAILABLE');
  if (!commercialProposal && selected.includes('P02')) reasons.push('EVIDENCE_INSUFFICIENT');
  if (!commercialProposal && selected.includes('P04')) reasons.push('MULTI_PIECE');
  if (!commercialProposal && selected.includes('P06')) reasons.push('ASSETS_REQUIRED');
  if (!commercialProposal && selected.includes('P09')) reasons.push('DISTRIBUTION_REQUESTED');
  if (commercialProposal && !commercialSource.valid) reasons.push('SOURCE_AUTHORITY_INSUFFICIENT');
  return {
    schema_version: 'content-intent-v2',
    request,
    request_hash: hashContentRequestV1(request),
    content_class: pieceClass,
    audience: normalize(input.audience) || null,
    outcome: normalize(input.outcome) || null,
    sources: commercialProposal
      ? commercialSource.valid
        ? [commercialSource.source.ref]
        : []
      : source.ref
        ? [String(source.ref)]
        : [],
    source_authority:
      commercialProposal
        ? commercialSource.valid
          ? 'partial'
          : 'unknown'
        : source.authority === 'verified'
        ? 'verified'
        : source.authority === 'unknown'
          ? 'unknown'
          : 'partial',
    channels: Array.isArray(input.channels) ? [...new Set(input.channels)].sort() : [],
    restrictions: Array.isArray(input.constraints) ? [...new Set(input.constraints)].sort() : [],
    effect_class: normalize(input.effectClass) || 'local_reversible',
    brief_sufficiency: commercialProposal && !commercialSource.valid
      ? 'insufficient'
      : questions.length === 0 ? 'complete' : questions.length < 3 ? 'partial' : 'insufficient',
    blocking_questions: questions.slice(0, 3),
    route_candidates: [{
      route_id: commercialProposal && !commercialSource.valid ? 'R0' : 'R6_CONTENT',
      score: 1,
      reason_codes: reasons,
    }],
    selected_stage_path: selected,
    brief_ref: normalize(input.briefRef) || 'work/content/brief.md',
    next_gate: selected.includes('P03')
      ? 'MW_BRIEF_APPROVED'
      : selected.includes('P08')
        ? 'MW_EDIT_APPROVED'
        : 'G14',
    decision: questions.length === 0 ? 'ROUTED' : 'NEEDS_INPUT',
  };
};

if (process.argv[1]?.endsWith('route-content.mjs')) {
  const [inputArg, ...rest] = process.argv.slice(2);
  if (!inputArg) throw new Error('Usage: route-content.mjs <request.json> [--out <content-intent.json>]');
  const outFlag = rest.indexOf('--out');
  const outputArg = outFlag >= 0 ? rest[outFlag + 1] : undefined;
  const intent = routeContentIntent(JSON.parse(readFileSync(resolve(inputArg), 'utf8')));
  const serialized = `${JSON.stringify(intent, null, 2)}\n`;
  if (outputArg) {
    const output = resolve(outputArg);
    mkdirSync(dirname(output), {recursive: true});
    writeFileSync(output, serialized, 'utf8');
  } else process.stdout.write(serialized);
}
