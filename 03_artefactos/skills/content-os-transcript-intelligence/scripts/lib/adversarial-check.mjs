import {createHash} from 'node:crypto';
import {cpSync, mkdirSync, readFileSync, symlinkSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

export function runAdversarial({dir, temp, run, errors, prefix}) {
  const adversarial = json(resolve(dir, 'fixtures/negative/adversarial-cases.json'));
  const positiveDir = resolve(dir, 'fixtures/positive');
  function writeCase(id, mutate) {
    const caseDir = resolve(temp, `case-${id}`);
    cpSync(positiveDir, caseDir, {recursive: true});
    const jobPath = resolve(caseDir, 'job.json');
    const job = json(jobPath);
    const asrPath = resolve(caseDir, 'asr-candidate.json');
    const asr = json(asrPath);
    const authorityPath = resolve(caseDir, 'authority.json');
    const authority = json(authorityPath);
    mutate({job, asr, authority, dir: caseDir});
    writeFileSync(asrPath, `${JSON.stringify(asr, null, 2)}\n`);
    writeFileSync(authorityPath, `${JSON.stringify(authority, null, 2)}\n`);
    const asrInput = job.inputs?.find((input) => input.class === 'asr_candidate');
    const authorityInput = job.inputs?.find((input) => input.class === 'authority');
    if (asrInput) asrInput.sha256 = sha256(readFileSync(asrPath));
    const authoritySha = sha256(readFileSync(authorityPath));
    if (authorityInput) authorityInput.sha256 = authoritySha;
    for (const audioInput of job.inputs?.filter((input) => input.class === 'literal_audio' && input.ref === 'authority.json') ?? []) {
      audioInput.sha256 = authoritySha;
      job.source.derivedAudioSha256 = authoritySha;
    }
    writeFileSync(jobPath, `${JSON.stringify(job, null, 2)}\n`);
    return jobPath;
  }
  function makeWav(sampleCount) {
    const dataBytes = sampleCount * 2;
    const wav = Buffer.alloc(44 + dataBytes);
    wav.write('RIFF', 0); wav.writeUInt32LE(36 + dataBytes, 4); wav.write('WAVE', 8);
    wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28);
    wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36);
    wav.writeUInt32LE(dataBytes, 40);
    return wav;
  }
  function bindWav(job, caseDir, wav, derivedFromSourceSha256) {
    writeFileSync(resolve(caseDir, 'synthetic.wav'), wav);
    const audioSha = sha256(wav);
    job.source.audioAvailable = true;
    job.source.derivedAudioSha256 = audioSha;
    job.inputs.push({class: 'literal_audio', ref: 'synthetic.wav', sha256: audioSha, authorityClass: 'synthetic-audio', derivedFromSourceSha256});
  }
  const mutations = {
    'audio-ref-is-json': ({job}) => {
      const audioSha = sha256(readFileSync(resolve(positiveDir, 'authority.json')));
      job.source.audioAvailable = true;
      job.source.derivedAudioSha256 = audioSha;
      job.inputs.push({class: 'literal_audio', ref: 'authority.json', sha256: audioSha, authorityClass: 'synthetic-audio', derivedFromSourceSha256: job.source.sha256});
    },
    'audio-source-binding-mismatch': ({job, dir: caseDir}) => bindWav(job, caseDir, makeWav(160), '0'.repeat(64)),
    'audio-zero-duration': ({job, dir: caseDir}) => bindWav(job, caseDir, makeWav(0), job.source.sha256),
    'audio-corrupt-payload': ({job, dir: caseDir}) => bindWav(job, caseDir, Buffer.from('524946460100000057415645', 'hex'), job.source.sha256),
    'negative-span': ({asr}) => { asr.segments[0].startSeconds = -1; },
    'reversed-span': ({asr}) => { asr.segments[0].endSeconds = asr.segments[0].startSeconds; },
    'span-out-of-bounds': ({asr}) => { asr.segments[0].endSeconds = 61; },
    'local-clock-before-origin': ({job}) => { job.clocks.local.originAbsoluteSeconds = 10; },
    'absolute-origin-incoherent': ({job}) => { job.clocks.absolute.originSeconds = 10; job.clocks.local.originAbsoluteSeconds = 1; },
    'material-authority-null-ref': ({authority}) => {
      authority.terms[0].material = true; authority.terms[0].materialKind = 'product'; authority.terms[0].authorityRef = null;
    },
    'material-canonical-null-ref': ({authority}) => {
      const term = authority.terms.find((item) => item.canonical === 'dashboard');
      term.material = true; term.materialKind = 'product'; term.authorityRef = null;
    },
    'private-package-disabled': ({job}) => { job.policy.publicPackage = false; },
    'source-hash-not-real': ({job}) => { job.source.sha256 = 'f'.repeat(64); },
    'model-hash-not-real': ({job}) => { job.provenance.model.sha256 = 'f'.repeat(64); },
    'config-hash-not-real': ({job}) => { job.provenance.config.sha256 = 'f'.repeat(64); },
    'path-traversal': ({job}) => { job.source.ref = '../positive/source.txt'; },
    'symlink-escape': ({job, dir: caseDir}) => {
      const outside = resolve(temp, 'outside-source.txt');
      writeFileSync(outside, 'outside synthetic source\n');
      symlinkSync(outside, resolve(caseDir, 'escape.txt'));
      job.source.ref = 'escape.txt';
    },
  };
  for (const test of adversarial.cases) {
    if (['legacy-derivative-block', 'material-authority-unverified', 'absolute-output', 'traversal-output', 'symlink-output'].includes(test.id)) continue;
    const jobPath = writeCase(test.id, mutations[test.id]);
    const command = test.id === 'private-package-disabled' ? 'package' : 'verify';
    const result = run([command, '--job', jobPath, '--out', `outputs/out-${test.id}`]);
    if (result.status === 0 || !result.stderr.includes(test.expectedCode)) errors.push(`${prefix}ADVERSARIAL ${test.id}:${result.stderr}`);
  }
  const outputJob = writeCase('output-confinement', () => {});
  const outputRoot = resolve(outputJob, '..');
  const outside = resolve(temp, 'outside-output');
  mkdirSync(outside, {recursive: true});
  symlinkSync(outside, resolve(outputRoot, 'output-link'));
  for (const [id, ref] of [['absolute-output', outside], ['traversal-output', '../outside-output'], ['symlink-output', 'output-link']]) {
    const result = run(['verify', '--job', outputJob, '--out', ref]);
    if (result.status === 0 || !result.stderr.includes('COSTI_UNSAFE_OUTPUT')) errors.push(`${prefix}ADVERSARIAL ${id}:${result.stderr}`);
  }
  const portable = run(['verify', '--job', outputJob, '--out', 'outputs/portable']);
  if (portable.status !== 0 || portable.stdout.includes(temp) || !portable.stdout.includes('-> outputs/portable')) errors.push(`${prefix}PORTABLE_STDOUT ${portable.stdout}${portable.stderr}`);
}
