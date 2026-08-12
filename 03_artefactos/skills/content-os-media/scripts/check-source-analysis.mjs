import {copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';

export function checkSourceAnalysis({root, contents, ajv}) {
  const validate = ajv.getSchema('source-analysis-v1');
  const analysis = JSON.parse(contents.get('skills/content-os-media/fixtures/positive/source-analysis-speech.json'));
  if (!validate(analysis)) throw new Error(`COSM_SOURCE_ANALYSIS_POSITIVE: ${ajv.errorsText(validate.errors)}`);
  const skipped = JSON.parse(contents.get('skills/content-os-media/fixtures/negative/source-analysis-skips-asr.json'));
  if (validate(skipped)) throw new Error('COSM_SOURCE_ANALYSIS_SKIPPED_ASR_ACCEPTED');
  const source = structuredClone(analysis.sources[0]);
  const variants = [
    ['MUSIC', {audioClassification:'music-sfx', asrAttempt:{status:'no-speech-detected',reason:'spectral and ASR evidence'}, transcriptIntelligence:{status:'not-applicable',reason:'no speech'}, editorialDecision:'use',state:'ready'}],
    ['SILENT', {probe:{...source.probe,hasAudio:false},audioClassification:'silent',asrAttempt:{status:'not-applicable',reason:'no audio stream'},transcriptIntelligence:{status:'not-applicable',reason:'no audio stream'},editorialDecision:'use',state:'ready'}],
    ['UNCERTAIN_SCHEMA', {audioClassification:'uncertain',editorialDecision:'blocked',state:'blocked'}],
  ];
  for (const [id, patch] of variants) { const item=structuredClone(analysis); Object.assign(item.sources[0],patch); if (!validate(item)) throw new Error(`COSM_SOURCE_ANALYSIS_${id}`); }
  const unresolved = structuredClone(analysis); Object.assign(unresolved.sources[0], {audioClassification:'uncertain',editorialDecision:'use',state:'ready'});
  if (validate(unresolved)) throw new Error('COSM_SOURCE_ANALYSIS_UNCERTAIN_READY_ACCEPTED');
  const gate = resolve(root, 'skills/content-os-media/scripts/source-analysis-gate.mjs');
  const run = (path) => spawnSync(process.execPath, [gate, path], {encoding:'utf8'});
  if (run(resolve(root,'skills/content-os-media/fixtures/positive/source-analysis-speech.json')).status !== 0) throw new Error('COSM_SOURCE_ANALYSIS_GATE_POSITIVE');
  if (run(resolve(root,'skills/content-os-media/fixtures/negative/source-analysis-skips-asr.json')).status === 0) throw new Error('COSM_SOURCE_ANALYSIS_GATE_NEGATIVE_ACCEPTED');
  for (const [fixture,marker] of [['source-analysis-missing-ref.json',':missing'],['source-analysis-hash-drift.json',':sha256-drift'],['source-analysis-absolute-ref.json',':unsafe-ref']]) {
    const result=run(resolve(root,`skills/content-os-media/fixtures/negative/${fixture}`));
    if (result.status===0 || !result.stderr.includes(marker)) throw new Error(`COSM_SOURCE_REF_NEGATIVE: ${fixture}`);
  }
  const dir=mkdtempSync(join(tmpdir(),'cosm-source-ref-'));
  try {
    mkdirSync(join(dir,'analysis')); const attacked=structuredClone(analysis);
    writeFileSync(join(dir,'source-analysis.json'),JSON.stringify(attacked));
    symlinkSync(resolve(root,'skills/content-os-media/fixtures/positive/analysis/asr-candidate.json'),join(dir,'analysis/asr-candidate.json'));
    copyFileSync(resolve(root,'skills/content-os-media/fixtures/positive/analysis/verification.json'),join(dir,'analysis/verification.json'));
    const symlink=run(join(dir,'source-analysis.json')); if (symlink.status===0 || !symlink.stderr.includes(':symlink')) throw new Error('COSM_SOURCE_REF_SYMLINK_ACCEPTED');
    attacked.sources[0].asrAttempt.candidateRef='../outside.json'; writeFileSync(join(dir,'source-analysis.json'),JSON.stringify(attacked));
    const traversal=run(join(dir,'source-analysis.json')); if (traversal.status===0 || !traversal.stderr.includes(':unsafe-ref')) throw new Error('COSM_SOURCE_REF_TRAVERSAL_ACCEPTED');
  } finally { rmSync(dir,{recursive:true,force:true}); }
}
