#!/usr/bin/env node
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {selectAulaCapabilityV1} from '../../02_proceso/workflows/multimedia/_runner/aula-capability-v1.ts';
import {dispatchIntent} from '../../03_artefactos/skills/content-os-router/scripts/route-intent.mjs';
const manifest = JSON.parse(
  readFileSync('04_estado/registries/skills/aula-decks-package.json', 'utf8'),
);
assert.equal(manifest.skills.length, 18);
const examples = '03_artefactos/renderers/frames-aula/examples/';
const moduleTemplate = JSON.parse(readFileSync(examples + 'module.template.json', 'utf8'));
const pieceSections = Object.fromEntries(
  [
    'immersive-class',
    'masterclass',
    'workbook',
    'lean-coffee',
    'playbook',
    'playbook-immersive',
  ].map((kind) => [kind, JSON.parse(readFileSync(examples + kind + '.json', 'utf8')).sections]),
);
assert.deepEqual(JSON.parse(readFileSync(examples + 'module.json', 'utf8')), {
  ...moduleTemplate,
  pieceSections,
});

execFileSync(
  'python3',
  ['-m', 'unittest', 'discover', '-s', '03_artefactos/renderers/frames-aula/tests'],
  {
    env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'},
    timeout: 60_000,
  },
);
execFileSync(
  'python3',
  ['05_verificacion/scripts/build-aula-decks.py', '--dest', '03_artefactos', '--check'],
  {
    env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'},
    timeout: 60_000,
  },
);
execFileSync(
  'python3',
  ['-m', 'unittest', 'discover', '-s', '05_verificacion/scripts', '-p', 'test_build_aula*.py'],
  {
    timeout: 60_000,
    env: {
      ...process.env,
      AULA_CHROMIUM_EXECUTABLE: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '',
      PYTHONDONTWRITEBYTECODE: '1',
    },
  },
);
for (const entry of manifest.skills)
  execFileSync('python3', [`skills/${entry.name}/scripts/check.py`], {
    env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'},
    timeout: 60_000,
  });
for (const [request, kind] of [
  ['Crear un workbook', 'workbook'],
  ['Masterclass sobre conceptos', 'masterclass'],
  ['Clase inmersiva', 'immersive-class'],
  ['Crear una clase inmersiva para capacitación', 'immersive-class'],
  ['Kit completo para un taller', 'module'],
  ['Playbook inmersivo', 'playbook-immersive'],
  ['Lean Coffee de cierre', 'lean-coffee'],
  ['Deck comercial', 'dynamic-commercial-decks'],
]) {
  assert.equal(selectAulaCapabilityV1(request).kind, kind);
  const routed = dispatchIntent({
    request,
    audience: 'Facilitadores',
    outcome: 'Practicar',
    source: {type: 'notes', authority: 'verified', ref: 'brief.md'},
  });
  assert.equal(routed.route_id, 'R6');
  assert.equal(routed.preferred_capability.kind, kind);
}
assert.equal(selectAulaCapabilityV1('Crear un workbook de marca blanca').edition, 'white-label');
assert.equal(selectAulaCapabilityV1('Crear un video'), null);
assert.throws(() => selectAulaCapabilityV1('workbook', 'unexpected'), /AULA_EDITION_INVALID/);
console.log(
  'PASS Aula: 18 packages and pertinent routing. Full material continuation exercised by integration suite.',
);
