const escape = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

export const html = escape;
export const cta = (label: string, href: string) =>
  `<a class="cta" href="${escape(href)}">${escape(label)}<svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 10h11m-4-4 4 4-4 4"/></svg></a>`;
export const copyAffordance = (target: string, label: string) =>
  `<button class="copy" type="button" data-copy-target="${escape(target)}" aria-label="${escape(label)}"><svg aria-hidden="true" viewBox="0 0 20 20"><rect x="6" y="6" width="9" height="9"/><path d="M4 12H3V3h9v1"/></svg></button>`;
export const copyEnhancement = (copied: string, fallback: string) =>
  `<p class="sr-only" id="copy-status" aria-live="polite"></p><script>(()=>{const d=document,s=d.querySelector('#copy-status'),f=t=>{const r=d.createRange();r.selectNodeContents(t);const q=getSelection();q.removeAllRanges();q.addRange(r);s.textContent=${JSON.stringify(fallback)}};d.documentElement.classList.add('copy-ready');d.addEventListener('click',async e=>{const b=e.target.closest('[data-copy-target]');if(!b)return;const t=d.getElementById(b.dataset.copyTarget);if(!t)return;try{if(!navigator.clipboard)throw 0;await navigator.clipboard.writeText(t.textContent||'');s.textContent=${JSON.stringify(copied)}}catch{f(t)}})})()</script>`;

export type AdapterTheme = {
  colors: {
    navy: string;
    gold: string;
    goldText: string;
    lightCanvas: string;
    lightSurface: string;
    lightText: string;
    lightFocus: string;
    darkCanvas: string;
    darkSurface: string;
    darkText: string;
    darkFocus: string;
  };
  typography: {heading: string; body: string; fallback: string};
  radius: {small: string; medium: string};
  layout: {contentMax: string; touchTargetMin: string};
};

export const shell = (
  locale: string,
  title: string,
  body: string,
  skip: string,
  direction: string,
  theme: AdapterTheme,
  enhancement = '',
) => `<!doctype html>
<html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><style>
:root{--navy:${theme.colors.navy};--gold:${theme.colors.gold};--gold-text:${theme.colors.goldText};--paper:${theme.colors.lightCanvas};--surface:${theme.colors.lightSurface};--ink:${theme.colors.lightText};--focus:${theme.colors.lightFocus};--radius:${theme.radius.medium};font-family:${theme.typography.body},${theme.typography.fallback}}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);line-height:1.55;overflow-wrap:anywhere}header,main,footer{width:min(${theme.layout.contentMax},100% - 2rem);margin:auto}header,footer{padding:1.5rem 0}.brand{font:700 1.1rem ${theme.typography.heading},${theme.typography.fallback}}.skip{position:absolute;left:-999rem}.skip:focus{left:1rem;top:1rem;background:var(--surface);padding:.75rem;z-index:2}h1,h2{font-family:${theme.typography.heading},${theme.typography.fallback};line-height:1.05}h1{font-size:clamp(2.4rem,8vw,6rem);max-width:12ch}.hero{padding:clamp(3rem,10vw,8rem) 0}.lede{font-size:clamp(1.1rem,2vw,1.5rem);max-width:48rem}.cta,.copy{display:inline-flex;min-height:${theme.layout.touchTargetMin};align-items:center}.cta{gap:.6rem;background:var(--gold);color:var(--gold-text);padding:.8rem 1rem;border-radius:${theme.radius.small};font-weight:700;text-decoration:none}.cta svg,.copy svg{width:1.25rem;fill:none;stroke:currentColor;stroke-width:2}.copy{min-width:${theme.layout.touchTargetMin};justify-content:center;background:var(--surface);color:var(--ink);border:1px solid currentColor;border-radius:${theme.radius.small}}.cta:focus-visible,.copy:focus-visible,a:focus-visible{outline:3px solid var(--focus);outline-offset:3px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr));gap:1rem}.card{background:var(--surface);border:1px solid #cbd2df;border-radius:var(--radius);padding:1.25rem}.route{margin:2rem 0;padding:1.5rem;border-left:.3rem solid var(--gold);background:var(--surface)}.prompt{padding:1rem;background:var(--surface);border-radius:${theme.radius.small}}@media(prefers-color-scheme:dark){:root{--paper:${theme.colors.darkCanvas};--surface:${theme.colors.darkSurface};--ink:${theme.colors.darkText};--focus:${theme.colors.darkFocus}}}@media print{.skip,.cta,.copy{display:none}body{background:white;color:#000}.card,.route{break-inside:avoid}}
@media print{:root{--paper:#fff;--surface:#fff;--ink:#000}}
</style><style>.copy{display:none}.copy-ready .copy{display:inline-flex}.sr-only{position:absolute;left:-999rem}@media print{.copy{display:none!important}}</style></head><body data-design-direction="${escape(direction)}"><a class="skip" href="#content">${escape(skip)}</a><header><span class="brand">MetodologIA</span></header><main id="content">${body}</main><footer>MetodologIA · COMPILED</footer>${enhancement}</body></html>
`;
