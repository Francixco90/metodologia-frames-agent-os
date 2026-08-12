import {createHash} from 'node:crypto';
import {copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';

export function checkBrandKit({root, contents, ajv}) {
  const kit=JSON.parse(contents.get('skills/content-os-creative/assets/metodologia/brand-kit.json'));
  const validate=ajv.getSchema('brand-kit-v1');
  if (!validate(kit)) throw new Error(`COSC_CANONICAL_BRAND_KIT: ${ajv.errorsText(validate.errors)}`);
  const hash=(value)=>createHash('sha256').update(value).digest('hex');
  const input=structuredClone(kit); delete input.manifestSha256;
  if (hash(JSON.stringify(input))!==kit.manifestSha256) throw new Error('COSC_CANONICAL_MANIFEST_HASH');
  for (const asset of kit.assets) {
    const ref=asset.ref.split('#')[0]; const path=ref.startsWith('assets/')?resolve(root,'skills/content-os-creative',ref):resolve(root,ref);
    if (hash(readFileSync(path))!==asset.sha256) throw new Error(`COSC_CANONICAL_ASSET_HASH: ${asset.ref}`);
  }
  const gate=resolve(root,'skills/content-os-creative/scripts/brand-kit-gate.mjs');
  const userPath=resolve(root,'skills/content-os-creative/fixtures/positive/user-job/brand-kit.json');
  const run=(path)=>spawnSync(process.execPath,[gate,path],{encoding:'utf8'});
  if (run(userPath).status!==0) throw new Error('COSC_USER_BRAND_KIT_POSITIVE');
  const setHash=(value)=>{const copy=structuredClone(value);delete copy.manifestSha256;value.manifestSha256=hash(JSON.stringify(copy));};
  const dir=mkdtempSync(join(tmpdir(),'cosc-brand-kit-'));
  try {
    mkdirSync(join(dir,'assets')); copyFileSync(resolve(root,'skills/content-os-creative/fixtures/positive/user-job/provenance.json'),join(dir,'provenance.json'));
    const palette=resolve(root,'skills/content-os-creative/fixtures/positive/user-job/palette.json'); const base=JSON.parse(readFileSync(userPath,'utf8'));
    const attack=(id,mutate,marker,link=false)=>{rmSync(join(dir,'palette.json'),{force:true});link?symlinkSync(palette,join(dir,'palette.json')):copyFileSync(palette,join(dir,'palette.json'));const value=structuredClone(base);mutate(value);setHash(value);const path=join(dir,`${id}.json`);writeFileSync(path,JSON.stringify(value));const result=run(path);if(result.status===0||!result.stderr.includes(marker))throw new Error(`COSC_USER_BRAND_ATTACK: ${id}`);};
    const drift=structuredClone(base);drift.manifestSha256='0'.repeat(64);const driftPath=join(dir,'manifest-drift.json');writeFileSync(driftPath,JSON.stringify(drift));const driftResult=run(driftPath);if(driftResult.status===0||!driftResult.stderr.includes('manifest:sha256-drift'))throw new Error('COSC_USER_BRAND_ATTACK: manifest-drift');
    attack('missing',(v)=>{v.assets[0].ref='assets/missing.json';},':missing');
    attack('drift',(v)=>{v.assets[0].sha256='0'.repeat(64);},':sha256-drift');
    attack('absolute',(v)=>{v.assets[0].ref='/synthetic/palette.json';},':unsafe-ref');
    attack('traversal',(v)=>{v.assets[0].ref='../outside.json';},':unsafe-ref');
    attack('symlink',()=>{},':symlink',true);
  } finally { rmSync(dir,{recursive:true,force:true}); }
}
