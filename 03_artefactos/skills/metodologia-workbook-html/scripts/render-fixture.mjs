import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {basename, dirname, resolve} from 'node:path';

export const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
};

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const arrow = '<svg aria-hidden="true" viewBox="0 0 16 16"><path d="M3 8h9m-3-3 3 3-3 3"/></svg>';
const copy = '<svg aria-hidden="true" viewBox="0 0 16 16"><rect x="5" y="5" width="8" height="8" rx="1"/><path d="M3 11H2V2h9v1"/></svg>';

export const renderWorkbookHtml = (spec, locale) => {
  let promptIndex = 0;
  const sheets = locale.sheets.map((sheet) => {
    const steps = sheet.steps.map((step) => {
      promptIndex += 1;
      const groupId = `${locale.locale}-prompt-${promptIndex}`;
      const levels = spec.uiPattern.promptFormatOrder.map((format, index) => {
        const number = index + 1;
        return `<button type="button" role="tab" id="${groupId}-tab-${number}" aria-label="${escapeHtml(locale.uiLabels.level)} ${number}" aria-controls="${groupId}-panel-${number}" aria-selected="${number === 1}" tabindex="${number === 1 ? 0 : -1}" data-format="${format}"><span aria-hidden="true">${number}</span></button>`;
      }).join('');
      const panels = spec.uiPattern.promptFormatOrder.map((format, index) => {
        const number = index + 1;
        return `<pre id="${groupId}-panel-${number}" role="tabpanel" aria-labelledby="${groupId}-tab-${number}"${number === 1 ? '' : ' hidden'}>${escapeHtml(`[${format}] ${step.prompt}`)}</pre>`;
      }).join('');
      const copyLabel = `${locale.uiLabels.copyPrompt} · ${locale.uiLabels.level} 1`;
      return `<article id="${escapeHtml(step.id)}" data-prompt-library><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.instruction)}</p><div role="tablist" aria-label="${escapeHtml(locale.uiLabels.levels)}">${levels}</div>${panels}<button type="button" class="copy-prompt" aria-label="${escapeHtml(copyLabel)}" data-copy-target="${groupId}-panel-1">${copy}</button><p>${escapeHtml(step.evidence)}</p></article>`;
    }).join('');
    return `<section id="${escapeHtml(sheet.id)}"><h2>${escapeHtml(sheet.title)}</h2><p>${escapeHtml(sheet.purpose)}</p>${steps}</section>`;
  }).join('');
  const behavior = `<script>document.documentElement.classList.add('js');document.querySelectorAll('[data-prompt-library]').forEach((library)=>{const tabs=[...library.querySelectorAll('[role="tab"]')];const panels=[...library.querySelectorAll('[role="tabpanel"]')];const copyButton=library.querySelector('.copy-prompt');const activate=(tab)=>{tabs.forEach((item,index)=>{const active=item===tab;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;panels[index].hidden=!active});copyButton.dataset.copyTarget=tab.getAttribute('aria-controls');copyButton.setAttribute('aria-label',copyButton.getAttribute('aria-label').replace(/\\d+$/,tab.textContent.trim()));tab.focus()};tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>activate(tab));tab.addEventListener('keydown',(event)=>{let next=null;if(event.key==='ArrowRight')next=tabs[(index+1)%tabs.length];if(event.key==='ArrowLeft')next=tabs[(index-1+tabs.length)%tabs.length];if(event.key==='Home')next=tabs[0];if(event.key==='End')next=tabs.at(-1);if(next){event.preventDefault();activate(next)}})});copyButton.addEventListener('click',async()=>{const text=document.getElementById(copyButton.dataset.copyTarget).textContent;if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text)}else{const area=document.createElement('textarea');area.value=text;document.body.append(area);area.select();document.execCommand('copy');area.remove()}})})</script>`;
  const styles='<style>[role="tabpanel"][hidden]{display:block}.js [role="tabpanel"][hidden]{display:none}@media print{[role="tabpanel"][hidden]{display:block!important}[role="tablist"],.copy-prompt,.primary-cta{display:none!important}}</style>';
  return `<!doctype html><html lang="${escapeHtml(locale.locale)}"><head><meta charset="utf-8"><meta name="workbook-spec-sha256" content="${spec.specSha256}"><title>${escapeHtml(locale.title)}</title>${styles}</head><body><main><h1>${escapeHtml(locale.title)}</h1><p>${escapeHtml(locale.intro)}</p><a class="primary-cta" href="#${escapeHtml(locale.sheets[0].id)}">${escapeHtml(locale.primaryCta)}${arrow}</a>${sheets}</main>${behavior}</body></html>`;
};

export const compileFixture = (spec, outputRoot) => {
  const hashInput = structuredClone(spec);
  delete hashInput.specSha256;
  const actualSpecSha256 = sha256(JSON.stringify(canonicalize(hashInput)));
  if (actualSpecSha256 !== spec.specSha256) throw new Error('WORKBOOK_SPEC_HASH_DRIFT');

  const outputs = {};
  for (const locale of spec.locales) {
    const relative = `${locale.locale}/workbook.html`;
    const bytes = `${renderWorkbookHtml(spec, locale)}\n`;
    const path = resolve(outputRoot, relative);
    mkdirSync(dirname(path), {recursive: true});
    writeFileSync(path, bytes);
    outputs[relative] = sha256(bytes);
  }
  const manifest = `${JSON.stringify({schemaVersion: 'workbook-build-manifest-v1', specSha256: spec.specSha256, state: 'RENDERED_DRAFT', outputs}, null, 2)}\n`;
  writeFileSync(resolve(outputRoot, 'build-manifest.json'), manifest);
  const receipt = `${JSON.stringify({schemaVersion: 'workbook-build-receipt-v1', manifestSha256: sha256(manifest), specSha256: spec.specSha256, state: 'RENDERED_DRAFT'}, null, 2)}\n`;
  writeFileSync(resolve(outputRoot, 'build-receipt.json'), receipt);
};

if (process.argv[1] && basename(process.argv[1]) === 'render-fixture.mjs') {
  const [specPath, outputRoot] = process.argv.slice(2);
  if (!specPath || !outputRoot) throw new Error('USAGE: render-fixture.mjs <spec.json> <output-dir>');
  compileFixture(JSON.parse(readFileSync(resolve(specPath), 'utf8')), resolve(outputRoot));
}
