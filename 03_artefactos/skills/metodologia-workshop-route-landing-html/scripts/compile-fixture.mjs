import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {basename, dirname, resolve} from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';

export const sha256 = (value) => createHash('sha256').update(value).digest('hex');

export const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
};

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

const arrow = '<svg aria-hidden="true" viewBox="0 0 16 16"><path d="M3 8h9m-3-3 3 3-3 3"/></svg>';
const localeNames = {es: 'ES', en: 'EN', pt: 'PT'};

const styles = `<style>
:root{color-scheme:light dark;--navy:#0a122a;--gold:#d6a900;--paper:#f7f7f2;--ink:#0a122a;--line:#c7cbd6;--space:clamp(1rem,3vw,3rem)}
@media(prefers-color-scheme:dark){:root{--paper:#0a122a;--ink:#f8fafc;--line:#526078;--gold:#ffd700}.items li,.resource{background:#172033}.eyebrow{color:#ffd700}}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:system-ui,sans-serif;line-height:1.55}
a{color:inherit}.skip{position:absolute;left:.5rem;top:-5rem;background:var(--navy);color:white;padding:.75rem;z-index:3}.skip:focus{top:.5rem}
header{position:relative;border-bottom:1px solid var(--line);padding:1rem var(--space)}nav ul,.languages,.items{display:flex;gap:.75rem;flex-wrap:wrap;list-style:none;padding:0;margin:.5rem 0}
main{max-width:76rem;margin:auto}section{min-height:60vh;padding:clamp(3rem,8vw,8rem) var(--space);border-bottom:1px solid var(--line)}
.eyebrow{font-size:.8rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#7b6200}h1,h2{max-width:18ch;line-height:1.02;font-size:clamp(2.4rem,7vw,6.5rem);margin:.3em 0}p{max-width:64ch}.items li,.resource{border:1px solid var(--line);border-radius:1rem;padding:1rem;background:color-mix(in srgb,var(--paper) 92%,var(--gold))}
.cta{display:inline-flex;align-items:center;gap:.5rem;background:var(--gold);color:var(--navy);font-weight:800;text-decoration:none;padding:.8rem 1rem;border-radius:.6rem}.cta svg{width:1rem;fill:none;stroke:currentColor;stroke-width:1.6}
.resources{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr));gap:1rem}.pending{display:inline-block;font-weight:700;color:#655b40}
:focus-visible{outline:3px solid var(--gold);outline-offset:3px}@media(max-width:40rem){section{min-height:auto}.chapters>ul{display:none}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}@media print{header,.skip,.cta{display:none!important}section{min-height:auto;break-inside:avoid;padding:1rem 0}body{background:white;color:black}}
@media(prefers-color-scheme:dark){.eyebrow,.pending{color:#ffd700}}
</style>`;

export const renderLandingHtml = (spec, locale) => {
  const stateById = new Map(spec.resourceRegistry.map((resource) => [resource.id, resource]));
  const languageLinks = spec.locales.map((item) => `<li><a href="../${escapeHtml(item.locale)}/index.html"${item.locale === locale.locale ? ' aria-current="page"' : ''}>${localeNames[item.locale]}</a></li>`).join('');
  const chapterLinks = locale.sections.map((section) => `<li><a href="#${escapeHtml(section.id)}">${escapeHtml(section.eyebrow)}</a></li>`).join('');
  const localizedResources = new Map(locale.resources.map((resource) => [resource.id, resource]));
  const resources = spec.resourceRegistry.map((resource) => {
    const text = localizedResources.get(resource.id);
    if (resource.status === 'available') return `<article class="resource" data-resource-status="available"><p class="eyebrow">${escapeHtml(locale.labels.available)}</p><h3>${escapeHtml(text.title)}</h3><p>${escapeHtml(text.summary)}</p><a class="cta" href="../${escapeHtml(resource.ref)}">${escapeHtml(text.ctaLabel)}${arrow}</a></article>`;
    return `<article class="resource" data-resource-status="pending"><p class="eyebrow">${escapeHtml(locale.labels.pending)}</p><h3>${escapeHtml(text.title)}</h3><p>${escapeHtml(text.summary)}</p><span class="pending">${escapeHtml(text.ctaLabel)}</span></article>`;
  }).join('');
  const sections = locale.sections.map((section, index) => {
    const items = `<ul class="items">${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
    const extra = section.id === 'resources' ? `<div class="resources">${resources}</div>` : items;
    const cta = ['entry', 'invitation'].includes(section.id) ? `<p><a class="cta" href="../${escapeHtml(spec.registrationRef)}">${escapeHtml(locale.primaryCta)}${arrow}</a></p>` : '';
    return `<section id="${escapeHtml(section.id)}" data-section-index="${index + 1}"><p class="eyebrow">${escapeHtml(section.eyebrow)}</p>${index === 0 ? `<h1>${escapeHtml(section.title)}</h1>` : `<h2>${escapeHtml(section.title)}</h2>`}<p>${escapeHtml(section.body)}</p>${extra}${cta}</section>`;
  }).join('');
  return `<!doctype html><html lang="${escapeHtml(locale.locale)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="workshop-route-spec-sha256" content="${spec.specSha256}"><title>${escapeHtml(locale.title)}</title><meta name="description" content="${escapeHtml(locale.description)}">${styles}</head><body><a class="skip" href="#entry">${escapeHtml(locale.labels.skip)}</a><header><strong>MetodologIA</strong><nav class="chapters" aria-label="${escapeHtml(locale.labels.navigation)}"><ul>${chapterLinks}</ul></nav><nav aria-label="${escapeHtml(locale.labels.languages)}"><ul class="languages">${languageLinks}</ul></nav></header><main>${sections}</main></body></html>`;
};

export const compileFixture = (spec, outputRoot, {schema, specRoot} = {}) => {
  if (!schema || !specRoot) throw new Error('WORKSHOP_ROUTE_VALIDATION_CONTEXT_REQUIRED');
  const validate = new Ajv2020({allErrors: true, strict: true}).compile(schema);
  if (!validate(spec)) throw new Error(`WORKSHOP_ROUTE_SPEC_INVALID: ${JSON.stringify(validate.errors)}`);
  const hashInput = structuredClone(spec);
  delete hashInput.specSha256;
  const actualSpecSha256 = sha256(JSON.stringify(canonicalize(hashInput)));
  if (actualSpecSha256 !== spec.specSha256) throw new Error('WORKSHOP_ROUTE_SPEC_HASH_DRIFT');
  const lockPath = resolve(specRoot, spec.designSystemLock.ref);
  const lockBytes = readFileSync(lockPath);
  if (sha256(lockBytes) !== spec.designSystemLock.sha256) throw new Error('WORKSHOP_ROUTE_DESIGN_LOCK_DRIFT');
  const outputs = {};
  for (const locale of spec.locales) {
    const relative = `${locale.locale}/index.html`;
    const bytes = `${renderLandingHtml(spec, locale)}\n`;
    const path = resolve(outputRoot, relative);
    mkdirSync(dirname(path), {recursive: true});
    writeFileSync(path, bytes);
    outputs[relative] = sha256(bytes);
  }
  const supporting = {
    [spec.registrationRef]: '<!doctype html><html lang="en"><meta charset="utf-8"><title>Synthetic registration</title><p>Registration fixture</p></html>\n',
  };
  for (const resource of spec.resourceRegistry.filter(({status}) => status === 'available')) {
    supporting[resource.ref] = '<!doctype html><html lang="en"><meta charset="utf-8"><title>Synthetic resource</title><p>Available fixture</p></html>\n';
  }
  for (const [relative, bytes] of Object.entries(supporting)) {
    const path = resolve(outputRoot, relative);
    mkdirSync(dirname(path), {recursive: true});
    writeFileSync(path, bytes);
    outputs[relative] = sha256(bytes);
  }
  const manifest = `${JSON.stringify({schemaVersion: 'workshop-route-build-manifest-v1', specSha256: spec.specSha256, designSystemSha256: spec.designSystemLock.sha256, state: 'RENDERED_DRAFT', outputs}, null, 2)}\n`;
  writeFileSync(resolve(outputRoot, 'build-manifest.json'), manifest);
  const receipt = `${JSON.stringify({schemaVersion: 'workshop-route-build-receipt-v1', manifestSha256: sha256(manifest), specSha256: spec.specSha256, state: 'RENDERED_DRAFT', publicationAuthority: false}, null, 2)}\n`;
  writeFileSync(resolve(outputRoot, 'build-receipt.json'), receipt);
};

if (process.argv[1] && basename(process.argv[1]) === 'compile-fixture.mjs') {
  const [specPath, outputRoot] = process.argv.slice(2);
  if (!specPath || !outputRoot) throw new Error('USAGE: compile-fixture.mjs <spec.json> <output-dir>');
  const absoluteSpec = resolve(specPath);
  const schemaPath = resolve(dirname(new URL(import.meta.url).pathname), '../schemas/workshop-route-landing-spec-v1.schema.json');
  compileFixture(JSON.parse(readFileSync(absoluteSpec, 'utf8')), resolve(outputRoot), {schema: JSON.parse(readFileSync(schemaPath, 'utf8')), specRoot: dirname(absoluteSpec)});
}
