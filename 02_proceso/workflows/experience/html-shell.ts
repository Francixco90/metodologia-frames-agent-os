import {canonicalize} from '../../core/evidence/canonical-json.ts';

import type {BlueprintModel, ProjectionManifest} from './contracts.ts';

type ComponentRegistry = {components: {id: string; purpose: string}[]};
type ServiceBlueprint = {
  stages: {moment: string; frontstage: string; backstage: string; evidence: string}[];
};

const esc = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const inline = (value: string): string =>
  esc(value)
    .replace(/\*\*([^*]+)\*\*/gu, '<strong>$1</strong>')
    .replace(/`([^`]+)`/gu, '<code>$1</code>');

const markdownBlock = (markdown: string): string => {
  const blocks = markdown.split(/\n\n+/u);
  return blocks
    .map((block) => {
      const lines = block.split('\n');
      if (lines.every((line) => line.startsWith('- '))) {
        return `<ul>${lines.map((line) => `<li>${inline(line.slice(2))}</li>`).join('')}</ul>`;
      }
      return `<p>${lines.map(inline).join('<br />')}</p>`;
    })
    .join('');
};

const css = `
:root{color-scheme:light dark;--navy:#122562;--gold:#FFD700;--blue:#137DC5;--ink:#101a38;--muted:#526079;--canvas:#f3f7ff;--surface:#fff;--line:#ccd7ec;--focus:#137DC5;font-family:"Montserrat",system-ui,sans-serif}*{box-sizing:border-box}body{margin:0;background:#eaf1fc;color:var(--ink);line-height:1.65}.skip{position:fixed;z-index:8;top:.5rem;left:.5rem;translate:0 -160%;padding:.7rem 1rem;background:#fff;color:var(--navy);border:2px solid var(--blue);border-radius:8px}.skip:focus{translate:0}.theme{position:absolute;inline-size:1px;block-size:1px;overflow:hidden;clip-path:inset(50%)}.theme-label{position:fixed;z-index:4;top:1rem;right:1rem;min-height:44px;padding:.62rem .9rem;border:2px solid var(--navy);border-radius:999px;background:#fff;color:var(--navy);font-weight:700;cursor:pointer}.theme:focus-visible+.theme-label{outline:3px solid var(--focus);outline-offset:3px}.page{min-height:100vh;background:var(--canvas)}.theme:checked~.page{--ink:#f7f9ff;--muted:#b8c5df;--canvas:#09142f;--surface:#102149;--line:#2d4473;background:var(--canvas)}.wrap{width:min(1120px,calc(100% - 2rem));margin:auto;padding:4rem 0}.hero{position:relative;overflow:hidden;padding:clamp(2rem,6vw,5rem);border-radius:28px;background:var(--navy);color:#fff}.hero:after{content:"";position:absolute;right:-8%;bottom:-70%;width:50%;aspect-ratio:1;border-radius:50%;background:var(--gold);opacity:.16}.brand{color:var(--gold);font:700 .9rem "Poppins",system-ui;letter-spacing:.09em;text-transform:uppercase}.hero h1{max-width:16ch;margin:.7rem 0;font:700 clamp(2.4rem,7vw,5.6rem)/.98 "Poppins",system-ui}.lead{max-width:64ch;font-size:1.1rem;color:#dfe8ff}.status{display:inline-block;margin-top:1rem;padding:.35rem .7rem;border:1px solid #7ca9e8;border-radius:999px;font-weight:700}.grid{display:grid;grid-template-columns:repeat(12,1fr);gap:1rem;margin-top:1rem}.card{grid-column:span 6;padding:clamp(1.2rem,3vw,2rem);border:1px solid var(--line);border-radius:20px;background:var(--surface);box-shadow:0 18px 45px rgba(18,37,98,.08)}.card.full{grid-column:1/-1}.eyebrow{margin:0;color:var(--blue);font:700 .75rem "Poppins",system-ui;letter-spacing:.1em;text-transform:uppercase}h2{margin:.35rem 0 .8rem;font:700 clamp(1.35rem,3vw,2rem) "Poppins",system-ui;color:var(--ink)}p{margin:.5rem 0}li+li{margin-top:.45rem}code{padding:.12rem .35rem;border-radius:5px;background:color-mix(in srgb,var(--blue) 12%,transparent)}.journey{display:grid;grid-template-columns:repeat(4,1fr);gap:.7rem}.moment{padding:1rem;border-left:4px solid var(--gold);background:color-mix(in srgb,var(--surface) 92%,var(--blue));border-radius:10px}.moment b{display:block;font-family:"Poppins",system-ui}.components{display:flex;flex-wrap:wrap;gap:.55rem}.chip{padding:.42rem .7rem;border:1px solid var(--line);border-radius:999px;font-size:.86rem}.manifest{display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem}.datum{padding:.8rem;border-radius:10px;background:color-mix(in srgb,var(--surface) 90%,var(--blue));overflow-wrap:anywhere}.datum small{display:block;color:var(--muted)}footer{padding:2rem 0;color:var(--muted);font-size:.86rem}@media(max-width:760px){.card{grid-column:1/-1}.journey,.manifest{grid-template-columns:1fr}.wrap{width:min(100% - 1rem,1120px)}.hero{border-radius:20px}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}@media print{.theme-label,.skip{display:none}.wrap{width:100%;padding:0}.hero{border-radius:0}.card{box-shadow:none;break-inside:avoid}.page{--ink:#101a38;--canvas:#fff;--surface:#fff;--line:#bcc7d8;background:#fff}}`;

export const renderExperienceHtml = (
  model: BlueprintModel,
  manifest: ProjectionManifest,
  registry: ComponentRegistry,
  service: ServiceBlueprint,
): string => {
  const modelJson = canonicalize(model).replaceAll('<', '\\u003c');
  const manifestJson = canonicalize(manifest).replaceAll('<', '\\u003c');
  const sections = model.sections
    .map(
      (section, index) =>
        `<article class="card${index === 0 || index > 10 ? ' full' : ''}" id="${section.id}"><p class="eyebrow">${section.id}</p><h2>${esc(section.title)}</h2>${markdownBlock(section.markdown)}</article>`,
    )
    .join('');
  const moments = service.stages
    .map(
      (stage) =>
        `<div class="moment"><b>${esc(stage.moment)}</b><span>${esc(stage.frontstage)}</span></div>`,
    )
    .join('');
  const components = registry.components
    .map((item) => `<span class="chip" title="${esc(item.purpose)}">${esc(item.id)}</span>`)
    .join('');
  return `<!doctype html>
<!-- prettier-ignore -->
<html lang="es"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><meta name="description" content="Blueprint canónico de experiencia de Frames ContentOS" /><meta name="author" content="MetodologIA" /><meta name="generator" content="Frames Experience Renderer v1" /><meta name="robots" content="noindex,nofollow" /><meta name="state" content="${model.state}" /><meta name="content-sha256" content="${manifest.content_sha256}" /><meta name="projection-manifest" content="${manifest.projection_ref}" /><meta name="typography-status" content="${manifest.typography_status}" /><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; script-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" /><title>${esc(model.title)} · MetodologIA</title><style>${css}</style></head>
<body><a class="skip" href="#contenido">Saltar al contenido</a><input class="theme" id="theme" type="checkbox" /><label class="theme-label" for="theme">Claro / oscuro</label><div class="page"><main class="wrap" id="contenido"><header class="hero"><div class="brand">${esc(model.identity)}</div><h1>Una intención normal. Un trabajo extraordinario.</h1><p class="lead">Blueprint operativo para recibir, entender, orientar, producir y recuperar con rigor.</p><span class="status">${model.state} · siguiente gate ${model.next_gate}</span></header><section class="grid" aria-label="Blueprint">${sections}<article class="card full"><p class="eyebrow">Journey visible</p><h2>Ocho momentos, una experiencia continua</h2><div class="journey">${moments}</div></article><article class="card full"><p class="eyebrow">GenUI allowlisted</p><h2>Once componentes, ninguna interfaz arbitraria</h2><div class="components">${components}</div></article><article class="card full" id="projection-manifest"><p class="eyebrow">Manifest de proyección</p><h2>Paridad visible y verificable</h2><div class="manifest"><div class="datum"><small>Blueprint</small>${esc(manifest.blueprint_id)}</div><div class="datum"><small>Secciones</small>${manifest.section_count}</div><div class="datum"><small>Estado</small>${manifest.state}</div><div class="datum"><small>Tipografía</small>${manifest.typography_status}</div><div class="datum"><small>Fuente</small>${esc(manifest.source_ref)}</div><div class="datum"><small>Proyección</small>${esc(manifest.projection_ref)}</div><div class="datum"><small>Content SHA-256</small>${manifest.content_sha256}</div></div></article></section><footer>MetodologIA · Offline · Sin telemetría · ${manifest.design_profile}</footer></main></div><script id="canonical-model" type="application/json">${modelJson}</script><script id="canonical-projection-manifest" type="application/json">${manifestJson}</script></body></html>\n`;
};
