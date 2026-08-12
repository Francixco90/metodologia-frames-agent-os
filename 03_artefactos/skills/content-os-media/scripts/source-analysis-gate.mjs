#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {cpSync, existsSync, lstatSync, mkdtempSync, readFileSync, realpathSync, rmSync} from 'node:fs';
import {dirname, isAbsolute, join, relative, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import Ajv2020 from 'ajv/dist/2020.js';

const target = process.argv[2];
if (!target) { console.error('usage: source-analysis-gate.mjs <source-analysis.json>'); process.exit(2); }
if (lstatSync(target).isSymbolicLink()) { console.error('FAIL source-analysis-gate: analysis-symlink'); process.exit(1); }
const analysis = JSON.parse(readFileSync(target, 'utf8'));
const schema = JSON.parse(readFileSync(new URL('../schemas/source-analysis-v1.schema.json', import.meta.url), 'utf8'));
const validate = new Ajv2020({allErrors: true, strict: false}).compile(schema);
const errors = [];
if (!validate(analysis)) errors.push(...validate.errors.map((error) => `${error.instancePath}:${error.keyword}`));
const jobRoot = realpathSync(dirname(resolve(target)));
const verifyRef = (ref, expected, label) => {
  if (!ref || isAbsolute(ref) || ref.split(/[\\/]/u).includes('..')) { errors.push(`${label}:unsafe-ref`); return; }
  const candidate = resolve(jobRoot, ref);
  const lexical = relative(jobRoot, candidate);
  if (lexical.startsWith('..') || isAbsolute(lexical)) { errors.push(`${label}:outside-job`); return; }
  if (!existsSync(candidate)) { errors.push(`${label}:missing`); return; }
  if (lstatSync(candidate).isSymbolicLink() || realpathSync(candidate) !== candidate) { errors.push(`${label}:symlink`); return; }
  if (!lstatSync(candidate).isFile()) { errors.push(`${label}:not-file`); return; }
  const actual = createHash('sha256').update(readFileSync(candidate)).digest('hex');
  if (actual !== expected) errors.push(`${label}:sha256-drift`);
  return candidate;
};
const tiCli = resolve(dirname(new URL(import.meta.url).pathname), '../../content-os-transcript-intelligence/scripts/transcript-intelligence.mjs');
const verifyTranscript = (source) => {
  const ti = source.transcriptIntelligence;
  const jobPath = verifyRef(ti.jobRef, ti.jobSha256, `${source.sourceId}:ti-job`);
  const receiptPath = verifyRef(ti.verificationRef, ti.verificationSha256, `${source.sourceId}:ti-receipt`);
  if (!jobPath || !receiptPath) return;
  const job = JSON.parse(readFileSync(jobPath, 'utf8'));
  const asrPath = verifyRef(source.asrAttempt.candidateRef, source.asrAttempt.candidateSha256, `${source.sourceId}:asr`);
  if (!asrPath) return;
  const asr = JSON.parse(readFileSync(asrPath, 'utf8'));
  const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
  if (job.contractRevision !== 3 || job.source?.id !== source.sourceId || job.source?.sha256 !== source.sourceSha256) errors.push(`${source.sourceId}:ti-source-binding`);
  const asrInput = job.inputs?.find((input) => input.class === 'asr_candidate');
  if (asrInput?.ref !== relative(dirname(jobPath), asrPath) || asrInput?.sha256 !== source.asrAttempt.candidateSha256) errors.push(`${source.sourceId}:ti-asr-binding`);
  if (asr.model !== job.provenance?.model?.id || asr.modelSha256 !== job.provenance?.model?.sha256 || asr.configSha256 !== job.provenance?.config?.sha256) errors.push(`${source.sourceId}:asr-model-config-binding`);
  const temp = mkdtempSync(join(tmpdir(), 'cosm-ti-'));
  try {
    cpSync(dirname(jobPath), join(temp, 'job'), {recursive:true});
    const run = spawnSync(process.execPath, [tiCli, 'verify', '--job', join(temp, 'job', relative(dirname(jobPath), jobPath)), '--out', 'outputs/media-gate'], {encoding:'utf8'});
    if (run.status !== 0) { errors.push(`${source.sourceId}:ti-cli:${run.stderr.trim()}`); return; }
    const generated = JSON.parse(readFileSync(join(temp, 'job/outputs/media-gate/verification.json'), 'utf8'));
    if (generated.schemaVersion !== 'transcript-intelligence-verification-v1' || generated.state !== 'deterministic-passed' || generated.verdict !== 'PASS' || !generated.provenance?.hashesVerified) errors.push(`${source.sourceId}:ti-receipt-invalid`);
    if (JSON.stringify(generated) !== JSON.stringify(receipt)) errors.push(`${source.sourceId}:ti-receipt-drift`);
  } finally { rmSync(temp, {recursive:true, force:true}); }
};

const inside = (point, crop) => point.x >= crop.x && point.x < crop.x + crop.width && point.y >= crop.y && point.y < crop.y + crop.height;
for (const source of analysis.sources || []) {
  if (source.transcriptIntelligence?.status === 'deterministic-passed') verifyTranscript(source);
  const samples = [...source.sampleTimesMs].sort((a, b) => a - b);
  const covered = [...source.cropSafety.coveredSampleTimesMs].sort((a, b) => a - b);
  if (JSON.stringify(samples) !== JSON.stringify(covered)) errors.push(`${source.sourceId}:crop-temporal-coverage`);
  if (source.watermarkObservations.some((item) => !source.sampleTimesMs.includes(item.sampleTimeMs))) errors.push(`${source.sourceId}:watermark-sample-binding`);
  if (source.cropSafety.strategy === 'crop') {
    const crop = source.cropSafety.crop; const probe = source.probe;
    if (!crop || !probe.width || !probe.height || crop.x + crop.width > probe.width || crop.y + crop.height > probe.height) errors.push(`${source.sourceId}:crop-bounds`);
    if (source.cropSafety.safe && source.watermarkObservations.some((item) => item.present && item.points.some((point) => inside(point, crop)))) errors.push(`${source.sourceId}:watermark-retained`);
  }
  if (source.state === 'blocked' || source.editorialDecision === 'blocked') errors.push(`${source.sourceId}:unresolved`);
}
if (errors.length) { console.error(`FAIL source-analysis-gate: ${errors.join(',')}`); process.exit(1); }
console.log(`PASS source-analysis-gate: ${analysis.sources.length} source(s), probe>audio-class>asr-attempt>transcript-intelligence>crop`);
