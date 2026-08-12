#!/usr/bin/env node
import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const root = resolve('03_artefactos/skills/career-visual-auditor');
const runner = resolve(root, 'scripts/audit-page.mjs');
const fixture = resolve(root, 'fixtures/synthetic-career.html');
const manifest = resolve('03_artefactos/brand/career-design-system/manifest.v1.json');
const decision = resolve('03_artefactos/brand/career-design-system/decisions/design-selection-v1.json');
const audit = resolve(root, 'fixtures/audit-input.json');
const read = (ref) => readFileSync(resolve(root, ref), 'utf8');
const corpus = [read('SKILL.md'), read('LINEAGE.yml'), read('receipts/runtime-boundary.yml')].join('\n');
for (const token of [
  'name: career-visual-auditor', 'description: This skill should be used when',
  'version: 0.2.0', 'lifecycle_state: active', 'network_allowed: false',
  'publication_authority: false', '44×44', 'JS-off', 'UNKNOWN',
]) if (!corpus.includes(token)) throw new Error(`CAREER-VISUAL-AUDITOR-MISSING ${token}`);
if (/\/Users\/|\/home\/|file:\/\//u.test(corpus)) throw new Error('CAREER-VISUAL-AUDITOR-LOCATOR');
execFileSync(process.execPath, [
  runner, fixture, manifest, decision, audit,
], {stdio: 'inherit'});
const temporary = mkdtempSync(resolve(tmpdir(), 'career-visual-hostile-'));
const rejects = (name, html, expected, auditPayload = readFileSync(audit, 'utf8')) => {
  const htmlPath = resolve(temporary, `${name}.html`);
  const auditPath = resolve(temporary, `${name}.json`);
  writeFileSync(htmlPath, html);
  writeFileSync(auditPath, auditPayload);
  try {
    execFileSync(process.execPath, [runner, htmlPath, manifest, decision, auditPath], {stdio: 'pipe'});
    throw new Error(`CAREER-VISUAL-AUDITOR-FAIL-OPEN ${name}`);
  } catch (error) {
    if (String(error).includes('FAIL-OPEN')) throw error;
    if (!String(error.stderr).includes(expected)) throw new Error(`CAREER-VISUAL-AUDITOR-WRONG-FAILURE ${name}`);
  }
};
const html = readFileSync(fixture, 'utf8');
const portableHtml = html.replace('<head>', `<head><base href="${pathToFileURL(`${dirname(fixture)}/`).href}">`);
const baseline = resolve(temporary, 'baseline.html');
writeFileSync(baseline, portableHtml);
execFileSync(process.execPath, [runner, baseline, manifest, decision, audit], {stdio: 'pipe'});
rejects('raw-color', portableHtml.replace('<main class="career-shell">', '<main class="career-shell" style="color:#fff">'), 'semantic-economy');
rejects('missing-dialog', portableHtml.replace(/<dialog[\s\S]*?<\/dialog>/u, ''), 'required-interaction-sample');
rejects('broken-aria', portableHtml.replace('aria-labelledby="titulo-evidencia"', 'aria-labelledby="missing"'), 'semantic-economy');
rejects('js-off-drift', portableHtml.replace('<p>Ejemplo sintético.</p></div></noscript>', '<p>Contenido divergente.</p></div></noscript>'), 'js-off-content-parity');
rejects('spec-drift', portableHtml, 'SPEC-DRIFT', readFileSync(audit, 'utf8').replace(/"spec_sha256": "[a-f0-9]+"/u, '"spec_sha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"'));
const executiveSpec = readFileSync(resolve(root, 'fixtures/executive-cv-spec.json'), 'utf8');
const staleSpecPath = resolve(temporary, 'stale-spec.json');
writeFileSync(staleSpecPath, executiveSpec.replace(/"approved_spec_sha256": "[a-f0-9]+"/u, '"approved_spec_sha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"'));
rejects('stale-approval', portableHtml, 'SPEC-DRIFT', readFileSync(audit, 'utf8').replace('skills/career-visual-auditor/fixtures/executive-cv-spec.json', staleSpecPath));
const atsAudit = readFileSync(audit, 'utf8').replace('skills/career-visual-auditor/fixtures/executive-cv-spec.json', 'skills/evidence-first-cv/fixtures/runtime/verified/cv-spec.json').replace('f2f12717dd23f7436f074a4d54e1ba936f0b623067112c897015a5d8bcedc8dd', 'c659397015605ed5e9859c3978a66d6655378e1a1f6dcc4358ae513a2b2d9b7b').replace('CVVAR-SYNTH-VISUAL-ES', 'CVVAR-SYNTH-RUNTIME-ES');
rejects('ats-neutral-variant', portableHtml, 'VARIANT-BINDING', atsAudit);
console.info('PASS career-visual-auditor: independent, local-first and fail-closed.');
