#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {existsSync, lstatSync, readFileSync, realpathSync} from 'node:fs';
import {dirname, isAbsolute, relative, resolve} from 'node:path';
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
};

const inside = (point, crop) => point.x >= crop.x && point.x < crop.x + crop.width && point.y >= crop.y && point.y < crop.y + crop.height;
for (const source of analysis.sources || []) {
  if (source.asrAttempt?.status === 'candidate') verifyRef(source.asrAttempt.candidateRef, source.asrAttempt.candidateSha256, `${source.sourceId}:asr`);
  if (source.transcriptIntelligence?.status === 'deterministic-passed') verifyRef(source.transcriptIntelligence.verificationRef, source.transcriptIntelligence.verificationSha256, `${source.sourceId}:transcript-intelligence`);
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
