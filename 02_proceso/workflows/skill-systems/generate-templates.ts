import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {parse} from 'yaml';
import {z} from 'zod';

const Section = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]+$/u),
  title: z.string(),
  prompt: z.string(),
});
export const SkillSystemTemplateRegistryV1Schema = z.strictObject({
  schema_version: z.literal('skill-systems-template-registry-v1'),
  templates: z.array(
    z.strictObject({
      template_id: z.string().regex(/^[a-z][a-z0-9-]+-v\d+$/u),
      title: z.string(),
      purpose: z.string(),
      owner: z.string(),
      sections: z.array(Section).min(6).max(13),
    }),
  ),
});

type Template = z.infer<typeof SkillSystemTemplateRegistryV1Schema>['templates'][number];
const REGISTRY_REF = '02_proceso/workflows/skill-systems/template-registry.yml';
const OUTPUT_ROOT = '02_proceso/workflows/skill-systems/templates';
const hash = (value: string): string => createHash('sha256').update(value).digest('hex');
const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const modelFor = (template: Template) => ({
  schema_version: 'skill-systems-template-model-v1',
  ...template,
});

export const renderSkillSystemTemplateMarkdown = (template: Template): string => {
  const model = modelFor(template);
  const modelJson = JSON.stringify(model);
  const sections = template.sections
    .map(
      ({id, title, prompt}, index) => `## ${index + 1}. ${title}\n\n> ${prompt}\n\n⟦FIELD:${id}⟧`,
    )
    .join('\n\n');
  return `---\ntemplate_id: ${template.template_id}\nschema_version: skill-systems-template-model-v1\nstate: DRAFT\nowner: ${template.owner}\nmodel_sha256: ${hash(modelJson)}\n---\n\n# ${template.title}\n\n${template.purpose}\n\n${sections}\n\n<!-- skill-systems-template-data:${modelJson} -->\n`;
};

export const renderSkillSystemTemplateHtml = (template: Template): string => {
  const model = modelFor(template);
  const modelJson = JSON.stringify(model);
  const sections = template.sections
    .map(
      ({id, title, prompt}, index) =>
        `<section id="${id}"><p class="eyebrow">${index + 1}</p><h2>${escapeHtml(title)}</h2><p>${escapeHtml(prompt)}</p><div class="field">⟦FIELD:${id}⟧</div></section>`,
    )
    .join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"><meta name="frames-template-id" content="${template.template_id}"><meta name="frames-model-sha256" content="${hash(modelJson)}"><title>${escapeHtml(template.title)} · Frames ContentOS</title><style>:root{color-scheme:light dark;--bg:#0b1020;--card:#151c31;--ink:#f6f8ff;--muted:#b9c2da;--accent:#6ee7d8}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 system-ui,sans-serif}main{width:min(1100px,92vw);margin:auto;padding:4rem 0}.hero{padding:2rem;border:1px solid #34405f;border-radius:24px;background:linear-gradient(135deg,#1a2545,#11182b)}.kicker,.eyebrow{color:var(--accent);font-weight:800;letter-spacing:.08em;text-transform:uppercase}h1{font-size:clamp(2rem,6vw,4.5rem);line-height:1.05}section{margin-top:1rem;padding:1.5rem;border:1px solid #34405f;border-radius:18px;background:var(--card)}.field{min-height:5rem;padding:1rem;border:1px dashed #7381a6;border-radius:12px;color:var(--muted)}@media print{:root{--bg:#fff;--card:#fff;--ink:#111;--muted:#444;--accent:#075e54}main{width:100%;padding:0}section{break-inside:avoid}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}</style></head><body><main><header class="hero"><p class="kicker">Frames ContentOS · por MetodologIA</p><h1>${escapeHtml(template.title)}</h1><p>${escapeHtml(template.purpose)}</p></header>${sections}</main><script type="application/json" id="skill-systems-template-data">${modelJson.replaceAll('<', '\\u003c')}</script></body></html>\n`;
};

export const generateSkillSystemTemplates = (root: string, write: boolean): string[] => {
  const registry = SkillSystemTemplateRegistryV1Schema.parse(
    parse(readFileSync(resolve(root, REGISTRY_REF), 'utf8')) as unknown,
  );
  const issues: string[] = [];
  for (const template of registry.templates) {
    const outputs = new Map([
      [
        `${OUTPUT_ROOT}/${template.template_id}.template.md`,
        renderSkillSystemTemplateMarkdown(template),
      ],
      [
        `${OUTPUT_ROOT}/${template.template_id}.template.html`,
        renderSkillSystemTemplateHtml(template),
      ],
    ]);
    for (const [ref, expected] of outputs) {
      const absolute = resolve(root, ref);
      if (write) {
        mkdirSync(dirname(absolute), {recursive: true});
        writeFileSync(absolute, expected, 'utf8');
      } else if (!existsSync(absolute) || readFileSync(absolute, 'utf8') !== expected) {
        issues.push(`SSS-TEMPLATE-DRIFT ${ref}`);
      }
    }
  }
  return issues;
};

const isMain =
  process.argv[1] !== undefined &&
  realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  const issues = generateSkillSystemTemplates(process.cwd(), process.argv.includes('--write'));
  if (issues.length) {
    console.error(issues.join('\n'));
    process.exitCode = 1;
  } else
    console.info(
      `PASS skill-system templates (${process.argv.includes('--write') ? 'write' : 'check'})`,
    );
}
