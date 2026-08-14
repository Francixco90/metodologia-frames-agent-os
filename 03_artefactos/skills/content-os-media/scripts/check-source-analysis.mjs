import {createHash} from 'node:crypto';
import {cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';

export function checkSourceAnalysis({root, contents, ajv}) {
  const validate=ajv.getSchema('source-analysis-v1');
  const analysis=JSON.parse(contents.get('skills/content-os-media/fixtures/positive/source-analysis-speech.json'));
  if(!validate(analysis))throw new Error(`COSM_SOURCE_ANALYSIS_POSITIVE: ${ajv.errorsText(validate.errors)}`);
  const skipped=JSON.parse(contents.get('skills/content-os-media/fixtures/negative/source-analysis-skips-asr.json'));
  if(validate(skipped))throw new Error('COSM_SOURCE_ANALYSIS_SKIPPED_ASR_ACCEPTED');
  const source=structuredClone(analysis.sources[0]);
  for(const [id,patch] of [['MUSIC',{audioClassification:'music-sfx',asrAttempt:{status:'no-speech-detected',reason:'spectral evidence'},transcriptIntelligence:{status:'not-applicable',reason:'no speech'},editorialDecision:'use',state:'ready'}],['SILENT',{probe:{...source.probe,hasAudio:false},audioClassification:'silent',asrAttempt:{status:'not-applicable',reason:'no audio'},transcriptIntelligence:{status:'not-applicable',reason:'no audio'},editorialDecision:'use',state:'ready'}],['UNCERTAIN',{audioClassification:'uncertain',editorialDecision:'blocked',state:'blocked'}]]){const item=structuredClone(analysis);Object.assign(item.sources[0],patch);if(!validate(item))throw new Error(`COSM_SOURCE_ANALYSIS_${id}`);}
  const unresolved=structuredClone(analysis);Object.assign(unresolved.sources[0],{audioClassification:'uncertain',editorialDecision:'use',state:'ready'});if(validate(unresolved))throw new Error('COSM_SOURCE_ANALYSIS_UNCERTAIN_READY_ACCEPTED');
  const gate=resolve(root,'skills/content-os-media/scripts/source-analysis-gate.mjs');
  const run=(path)=>spawnSync(process.execPath,[gate,path],{encoding:'utf8'});
  if(run(resolve(root,'skills/content-os-media/fixtures/positive/source-analysis-speech.json')).status!==0)throw new Error('COSM_SOURCE_ANALYSIS_GATE_POSITIVE');
  const dir=mkdtempSync(join(tmpdir(),'cosm-source-ref-')); const hash=(value)=>createHash('sha256').update(value).digest('hex');
  try{
    cpSync(resolve(root,'skills/content-os-media/fixtures/positive/analysis'),join(dir,'analysis'),{recursive:true});
    const writeAnalysis=(value)=>{const path=join(dir,'source-analysis.json');writeFileSync(path,JSON.stringify(value));return path;};
    const attack=(id,mutate,marker)=>{const value=structuredClone(analysis);mutate(value);const result=run(writeAnalysis(value));if(result.status===0||!result.stderr.includes(marker))throw new Error(`COSM_SOURCE_ATTACK: ${id}`);};
    attack('missing',(v)=>{v.sources[0].asrAttempt.candidateRef='analysis/missing.json';},':missing');
    attack('drift',(v)=>{v.sources[0].asrAttempt.candidateSha256='0'.repeat(64);},':sha256-drift');
    attack('absolute',(v)=>{v.sources[0].asrAttempt.candidateRef='/synthetic/asr.json';},':unsafe-ref');
    attack('traversal',(v)=>{v.sources[0].asrAttempt.candidateRef='../outside.json';},':unsafe-ref');
    const asrPath=join(dir,'analysis/asr-candidate.json');const realAsr=readFileSync(asrPath);unlinkSync(asrPath);symlinkSync(resolve(root,'skills/content-os-media/fixtures/positive/analysis/asr-candidate.json'),asrPath);attack('symlink',()=>{},':symlink');unlinkSync(asrPath);writeFileSync(asrPath,realAsr);
    attack('asr-semantic',(v)=>{const asr=JSON.parse(readFileSync(asrPath));asr.model='wrong-model';writeFileSync(asrPath,JSON.stringify(asr));const asrHash=hash(readFileSync(asrPath));v.sources[0].asrAttempt.candidateSha256=asrHash;const jobPath=join(dir,'analysis/job.json');const job=JSON.parse(readFileSync(jobPath));job.inputs.find((x)=>x.class==='asr_candidate').sha256=asrHash;writeFileSync(jobPath,JSON.stringify(job));v.sources[0].transcriptIntelligence.jobSha256=hash(readFileSync(jobPath));},':asr-model-config-binding');
    cpSync(resolve(root,'skills/content-os-media/fixtures/positive/analysis'),join(dir,'analysis'),{recursive:true,force:true});
    attack('ti-semantic',(v)=>{const path=join(dir,'analysis/verification.json');const receipt=JSON.parse(readFileSync(path));receipt.state='candidate';receipt.verdict='FAIL';receipt.blockers=[{code:'synthetic-invalid'}];writeFileSync(path,JSON.stringify(receipt));v.sources[0].transcriptIntelligence.verificationSha256=hash(readFileSync(path));},':ti-receipt-drift');
  }finally{rmSync(dir,{recursive:true,force:true});}
}
