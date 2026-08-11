import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync} from 'node:fs';
import {dirname, isAbsolute, relative, resolve, sep} from 'node:path';
import {validateAudio} from './media-validation.mjs';

const HASH_RE = /^[a-f0-9]{64}$/;
const EVIDENCE_CLASSES = new Set(['literal_audio', 'asr_candidate', 'editorial_notes', 'visual_reference', 'inference']);

export function fail(code, detail = '') {
  console.error(`COSTI_${code}${detail ? ` ${detail}` : ''}`);
  process.exit(1);
}

export function argsOf(argv) {
  const out = {_: []};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) out._.push(token);
    else {
      const key = token.slice(2);
      out[key] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    }
  }
  return out;
}

export function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail('INVALID_JSON', `${path}: ${error.message}`);
  }
}

export function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export function safeRef(jobPath, ref, label) {
  const parts = typeof ref === 'string' ? ref.split(/[/\\]/u) : [];
  if (!ref || typeof ref !== 'string' || isAbsolute(ref) || parts.includes('..') || /(^|[/\\])(Users|Downloads|Documents)([/\\]|$)/i.test(ref)) {
    fail('UNSAFE_REF', label);
  }
  const base = realpathSync(dirname(jobPath));
  const candidate = resolve(base, ref);
  if (!existsSync(candidate)) fail('MISSING_REF', `${label}:${ref}`);
  const real = realpathSync(candidate);
  const rel = relative(base, real);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) fail('UNSAFE_REF', `${label}:outside-job-root`);
  if (!statSync(real).isFile()) fail('INVALID_REF_TYPE', label);
  return real;
}

export function verifiedRef(jobPath, input, label) {
  const path = safeRef(jobPath, input.ref, label);
  if (!HASH_RE.test(input.sha256 ?? '')) fail('INVALID_PROVENANCE', `${label}:sha256`);
  const actual = sha256File(path);
  if (actual !== input.sha256) fail('HASH_MISMATCH', `${label}:${input.ref}`);
  return {...input, path, actualSha256: actual};
}

function legacyInputs(job, jobPath) {
  const items = [
    {class: 'asr_candidate', ref: job.asrRef, authorityClass: 'candidate'},
    {class: 'authority', ref: job.authorityRef, authorityClass: 'declared-authority'},
    ...(job.notesRefs ?? []).map((ref) => ({class: 'editorial_notes', ref, authorityClass: 'locator-only'})),
  ];
  return items.map((item, index) => {
    const path = safeRef(jobPath, item.ref, `legacyInputs[${index}]`);
    const sha256 = sha256File(path);
    return {...item, path, sha256, actualSha256: sha256, legacyDerived: true};
  });
}

function loadInputs(job, jobPath, legacy) {
  if (legacy) return legacyInputs(job, jobPath);
  const inputs = job.inputs.map((input, index) => {
    if (!EVIDENCE_CLASSES.has(input.class) && input.class !== 'authority') fail('INVALID_EVIDENCE_CLASS', `inputs[${index}]`);
    return verifiedRef(jobPath, input, `inputs[${index}]`);
  });
  if (inputs.filter((input) => input.class === 'asr_candidate').length !== 1 || inputs.filter((input) => input.class === 'authority').length !== 1) {
    fail('INVALID_INPUTS', 'exactly-one-asr-and-authority-required');
  }
  const audioInputs = inputs.filter((input) => input.class === 'literal_audio');
  if (job.source.audioAvailable && audioInputs.length !== 1) fail('INVALID_INPUTS', 'exactly-one-literal_audio-required');
  if (!job.source.audioAvailable && audioInputs.length) fail('INVALID_INPUTS', 'literal_audio-without-audioAvailable');
  for (const audio of audioInputs) {
    validateAudio(audio.path, 'literal_audio', fail);
    if (audio.derivedFromSourceSha256 !== job.source.sha256 || audio.sha256 !== job.source.derivedAudioSha256) {
      fail('AUDIO_BINDING_MISMATCH', audio.ref);
    }
  }
  return inputs;
}

function validateJob(job, jobPath) {
  const errors = [];
  if (job.schemaVersion !== 'transcript-intelligence-v1') errors.push('schemaVersion');
  if (!job.projectId) errors.push('projectId');
  if (!job.source?.id || !HASH_RE.test(job.source?.sha256 ?? '')) errors.push('source');
  if (!job.source?.rights || !job.source?.authority) errors.push('source-authority');
  if (job.policy?.captionMode !== 'minimal-clarity') errors.push('captionMode');
  const legacy = job.contractRevision !== 3;
  if (!legacy) {
    if (!job.source.ref || !Number.isFinite(job.source.durationSeconds) || job.source.durationSeconds <= 0) errors.push('source-ref-duration');
    if (job.source.audioAvailable && !HASH_RE.test(job.source.derivedAudioSha256 ?? '')) errors.push('derived-audio-hash');
    if (!job.clocks?.absolute?.id || !job.clocks?.local?.id) errors.push('clocks');
    if (job.clocks?.absolute?.unit !== 'seconds' || job.clocks?.local?.unit !== 'seconds') errors.push('clock-units');
    if (!['absolute', 'local'].includes(job.clocks?.inputClock)) errors.push('inputClock');
    for (const value of [job.clocks?.absolute?.originSeconds, job.clocks?.local?.originAbsoluteSeconds]) {
      if (!Number.isFinite(value) || value < 0) errors.push('clock-origin');
    }
    if (!job.provenance?.model?.id || !job.provenance?.model?.ref || !HASH_RE.test(job.provenance?.model?.sha256 ?? '')) errors.push('model-provenance');
    if (!job.provenance?.config?.id || !job.provenance?.config?.ref || !HASH_RE.test(job.provenance?.config?.sha256 ?? '')) errors.push('config-provenance');
    if (!Array.isArray(job.inputs)) errors.push('inputs');
  } else {
    safeRef(jobPath, job.asrRef, 'asrRef');
    safeRef(jobPath, job.authorityRef, 'authorityRef');
    for (const [index, ref] of (job.notesRefs ?? []).entries()) safeRef(jobPath, ref, `notesRefs[${index}]`);
  }
  if (errors.length) fail('INVALID_JOB', errors.join(','));
  return legacy;
}

function validateSegments(segments, clocks, durationSeconds) {
  const localOrigin = clocks.local.originAbsoluteSeconds;
  const absoluteOrigin = clocks.absolute.originSeconds;
  if (localOrigin < absoluteOrigin || localOrigin > absoluteOrigin + durationSeconds) fail('CLOCK_ORIGIN_INCOHERENT', clocks.local.id);
  return segments.map((segment) => {
    if (!Number.isFinite(segment.startSeconds) || !Number.isFinite(segment.endSeconds) || segment.startSeconds < 0 || segment.endSeconds <= segment.startSeconds) {
      fail('INVALID_SPAN', segment.id ?? 'unknown');
    }
    const absoluteStart = clocks.inputClock === 'absolute' ? segment.startSeconds : segment.startSeconds + localOrigin;
    const absoluteEnd = clocks.inputClock === 'absolute' ? segment.endSeconds : segment.endSeconds + localOrigin;
    const localStart = clocks.inputClock === 'local' ? segment.startSeconds : segment.startSeconds - localOrigin;
    const localEnd = clocks.inputClock === 'local' ? segment.endSeconds : segment.endSeconds - localOrigin;
    if (absoluteStart < absoluteOrigin || absoluteEnd > absoluteOrigin + durationSeconds || localStart < 0 || localEnd <= localStart) fail('SPAN_OUT_OF_BOUNDS', segment.id ?? 'unknown');
    return {
      ...segment,
      clocks: {
        absolute: {clockId: clocks.absolute.id, startSeconds: absoluteStart, endSeconds: absoluteEnd},
        local: {clockId: clocks.local.id, startSeconds: localStart, endSeconds: localEnd},
      },
    };
  });
}

export function normalize(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
export function tokens(text) { return [...new Set(normalize(text).split(/\s+/).filter((token) => token.length > 1))]; }
export function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
export function span(segment) {
  return {sourceId: segment.sourceId, segmentId: segment.id, startSeconds: segment.clocks.absolute.startSeconds, endSeconds: segment.clocks.absolute.endSeconds, absolute: segment.clocks.absolute, local: segment.clocks.local};
}
export function writeJson(dir, name, value) { mkdirSync(dir, {recursive: true}); writeFileSync(resolve(dir, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }

export function loadContext(jobPath) {
  const job = readJson(jobPath);
  const legacy = validateJob(job, jobPath);
  const inputs = loadInputs(job, jobPath, legacy);
  const asrInput = inputs.find((input) => input.class === 'asr_candidate');
  const authorityInput = inputs.find((input) => input.class === 'authority');
  const asr = readJson(asrInput.path);
  const authority = readJson(authorityInput.path);
  if (!['asr-candidate-v1', 'asr-candidate-v2'].includes(asr.schemaVersion) || !Array.isArray(asr.segments)) fail('INVALID_ASR');
  if (!Array.isArray(authority.terms)) fail('INVALID_AUTHORITY');

  const clocks = legacy ? {inputClock: 'absolute', absolute: {id: 'source-media', unit: 'seconds', originSeconds: 0}, local: {id: 'selection', unit: 'seconds', originAbsoluteSeconds: 0}} : job.clocks;
  const durationSeconds = legacy ? Number.POSITIVE_INFINITY : job.source.durationSeconds;
  const source = legacy ? null : verifiedRef(jobPath, {ref: job.source.ref, sha256: job.source.sha256}, 'source');
  const model = legacy ? null : verifiedRef(jobPath, job.provenance.model, 'model');
  const config = legacy ? null : verifiedRef(jobPath, job.provenance.config, 'config');
  if (!legacy && (asr.model !== job.provenance.model.id || asr.modelSha256 !== model.sha256 || asr.configSha256 !== config.sha256)) fail('PROVENANCE_MISMATCH', 'asr-model-or-config');
  const segments = validateSegments(asr.segments.map((segment) => ({...segment, sourceId: job.source.id})), clocks, durationSeconds);
  const verifiedAuthorityRefs = new Set((authority.authorities ?? []).filter((item) => item.verified === true && item.id).map((item) => item.id));
  const provenance = {
    schemaVersion: 'transcript-provenance-v1',
    source: {id: job.source.id, ref: job.source.ref ?? null, sha256: job.source.sha256, rights: job.source.rights, authority: job.source.authority},
    audio: inputs.filter((input) => input.class === 'literal_audio').map(({ref, sha256, authorityClass, derivedFromSourceSha256}) => ({ref, sha256, authorityClass, derivedFromSourceSha256})),
    asr: {ref: asrInput.ref, sha256: asrInput.sha256, model: job.provenance?.model ?? null, config: job.provenance?.config ?? null},
    authority: {ref: authorityInput.ref, sha256: authorityInput.sha256, authorityClass: authorityInput.authorityClass},
    auxiliary: inputs.filter((input) => !['literal_audio', 'asr_candidate', 'authority'].includes(input.class)).map(({class: evidenceClass, ref, sha256, authorityClass}) => ({evidenceClass, ref, sha256, authorityClass})),
    evidenceClasses: [...new Set(inputs.filter((input) => input.class !== 'authority').map((input) => input.class))],
    hashesVerified: !legacy && Boolean(source && model && config),
  };
  return {job, asr, authority, verifiedAuthorityRefs, segments, clocks, provenance, compatibility: {inputRevision: legacy ? (job.contractRevision ?? 1) : 3, migratedInMemory: false, readOnly: legacy, warnings: legacy ? ['legacy-contract-read-only-migration-required'] : []}};
}
