#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {existsSync, lstatSync, readFileSync, realpathSync} from 'node:fs';
import {dirname, isAbsolute, relative, resolve} from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';

const target = process.argv[2];
if (!target) { console.error('usage: brand-kit-gate.mjs <brand-kit.json>'); process.exit(2); }
const errors = [];
if (lstatSync(target).isSymbolicLink()) errors.push('manifest:symlink');
const kit = JSON.parse(readFileSync(target, 'utf8'));
const schema = JSON.parse(readFileSync(new URL('../schemas/brand-kit-v1.schema.json', import.meta.url), 'utf8'));
const validate = new Ajv2020({allErrors:true, strict:false}).compile(schema);
if (!validate(kit)) errors.push(...validate.errors.map((error) => `${error.instancePath}:${error.keyword}`));
const canonical = structuredClone(kit); delete canonical.manifestSha256;
const manifestHash = createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
if (kit.manifestSha256 !== manifestHash) errors.push('manifest:sha256-drift');
const jobRoot = realpathSync(dirname(resolve(target)));
const verify = (ref, expected, label) => {
  const plain = ref?.split('#')[0];
  if (!plain || isAbsolute(plain) || plain.split(/[\\/]/u).includes('..')) { errors.push(`${label}:unsafe-ref`); return; }
  const candidate = resolve(jobRoot, plain); const lexical = relative(jobRoot, candidate);
  if (lexical.startsWith('..') || isAbsolute(lexical)) { errors.push(`${label}:outside-job`); return; }
  if (!existsSync(candidate)) { errors.push(`${label}:missing`); return; }
  if (lstatSync(candidate).isSymbolicLink() || realpathSync(candidate) !== candidate) { errors.push(`${label}:symlink`); return; }
  if (!lstatSync(candidate).isFile()) { errors.push(`${label}:not-file`); return; }
  const actual = createHash('sha256').update(readFileSync(candidate)).digest('hex');
  if (actual !== expected) errors.push(`${label}:sha256-drift`);
};
if (kit.kind === 'user-provided') {
  if (kit.rights !== 'user-authorized' || kit.provenance?.authority !== 'user') errors.push('user-kit:rights-provenance');
  verify(kit.provenance?.source, kit.provenance?.sourceSha256, 'provenance');
  for (const [index, asset] of (kit.assets ?? []).entries()) {
    if (asset.rights !== 'user-authorized') errors.push(`asset-${index}:rights`);
    verify(asset.ref, asset.sha256, `asset-${index}`);
  }
}
if (errors.length) { console.error(`FAIL brand-kit-gate: ${errors.join(',')}`); process.exit(1); }
console.log(`PASS brand-kit-gate: ${kit.kind}, manifest+rights+provenance+assets`);
