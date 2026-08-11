import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, isAbsolute, resolve} from 'node:path';

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

function safeRef(jobPath, ref, label) {
  if (!ref || typeof ref !== 'string' || isAbsolute(ref) || /(^|[/\\])(Users|Downloads|Documents)([/\\]|$)/i.test(ref)) {
    fail('UNSAFE_REF', label);
  }
  const result = resolve(dirname(jobPath), ref);
  if (!existsSync(result)) fail('MISSING_REF', `${label}:${ref}`);
  return result;
}

function validateJob(job, jobPath) {
  const errors = [];
  if (job.schemaVersion !== 'transcript-intelligence-v1') errors.push('schemaVersion');
  if (!job.projectId) errors.push('projectId');
  if (!job.source?.id || !/^[a-f0-9]{64}$/.test(job.source?.sha256 ?? '')) errors.push('source');
  if (!job.source?.rights || !job.source?.authority) errors.push('source-authority');
  if (job.policy?.captionMode !== 'minimal-clarity') errors.push('captionMode');
  safeRef(jobPath, job.asrRef, 'asrRef');
  safeRef(jobPath, job.authorityRef, 'authorityRef');
  for (const [index, ref] of (job.notesRefs ?? []).entries()) safeRef(jobPath, ref, `notesRefs[${index}]`);
  if (job.source.audioAvailable) {
    if (!job.source.audioRef) errors.push('audioRef');
    else safeRef(jobPath, job.source.audioRef, 'audioRef');
  }
  if (errors.length) fail('INVALID_JOB', errors.join(','));
}

export function normalize(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function tokens(text) {
  return [...new Set(normalize(text).split(/\s+/).filter((token) => token.length > 1))];
}

export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function span(segment) {
  return {sourceId: segment.sourceId, segmentId: segment.id, startSeconds: segment.startSeconds, endSeconds: segment.endSeconds};
}

export function writeJson(dir, name, value) {
  mkdirSync(dir, {recursive: true});
  writeFileSync(resolve(dir, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function loadContext(jobPath) {
  const job = readJson(jobPath);
  validateJob(job, jobPath);
  const asr = readJson(safeRef(jobPath, job.asrRef, 'asrRef'));
  const authority = readJson(safeRef(jobPath, job.authorityRef, 'authorityRef'));
  if (asr.schemaVersion !== 'asr-candidate-v1' || !Array.isArray(asr.segments)) fail('INVALID_ASR');
  if (!Array.isArray(authority.terms)) fail('INVALID_AUTHORITY');
  const segments = asr.segments.map((segment) => ({...segment, sourceId: job.source.id}));
  return {job, asr, authority, segments};
}
