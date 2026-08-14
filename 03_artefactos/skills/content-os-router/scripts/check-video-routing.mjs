import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import {fileURLToPath} from 'node:url';
const root = new URL('..', import.meta.url);
const run = (name) => JSON.parse(execFileSync(process.execPath, [fileURLToPath(new URL('scripts/video-source-route.mjs', root)), fileURLToPath(new URL(`fixtures/positive/${name}`, root))], {encoding:'utf8'}));
const contain = run('video-contain-default.json');
const crop = run('video-crop-safe.json');
const schema = JSON.parse(readFileSync(new URL('schemas/video-source-route-v1.schema.json', root), 'utf8'));
const validate = new Ajv2020({allErrors:true, strict:false}).compile(schema);
if (contain.route !== 'contain' || crop.route !== 'crop-safe' || !crop.reelSpecFirst || !validate(contain) || !validate(crop)) throw new Error('COSR_VIDEO_ROUTE_POSITIVE');
let blocked = false;
try { execFileSync(process.execPath, [fileURLToPath(new URL('scripts/video-source-route.mjs', root)), fileURLToPath(new URL('fixtures/negative/reel-without-spec.json', root))], {encoding:'utf8', stdio:'pipe'}); } catch (error) { blocked = String(error.stderr).includes('reel-spec-first-required'); }
if (!blocked) throw new Error('COSR_REEL_WITHOUT_SPEC_ACCEPTED');
console.log('PASS content-os-router video routing: contain default, crop-safe evidence, reject/block, reel Spec First');
