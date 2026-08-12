import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

const sha = (value) => createHash('sha256').update(value).digest('hex');
const canonical = (value) =>
  Array.isArray(value)
    ? `[${value.map(canonical).join(',')}]`
    : value && typeof value === 'object'
      ? `{${Object.keys(value)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
          .join(',')}}`
      : JSON.stringify(value);
const parse = (path) => JSON.parse(readFileSync(path, 'utf8'));
const material = (base, ref) => {
  const candidates = [resolve(base, ref), resolve(process.cwd(), ref), resolve(process.cwd(), '03_artefactos', ref)];
  const path = candidates.find(existsSync);
  if (!path) throw new Error(`CAREER-VISUAL-AUDIT-MISSING-AUTHORITY ${ref}`);
  return path;
};
const assertFile = (base, binding) => {
  const path = material(base, binding.ref ?? binding.manifest_ref ?? binding.rights_ref);
  const expected = binding.sha256 ?? binding.manifest_sha256 ?? binding.rights_sha256;
  if (sha(readFileSync(path)) !== expected) throw new Error(`CAREER-VISUAL-AUDIT-ASSET-DRIFT ${path}`);
  return path;
};

export const loadAuditAuthority = (manifestInput, decisionInput, auditInput) => {
  const manifestPath = resolve(manifestInput);
  const manifest = parse(manifestPath);
  const decision = parse(resolve(decisionInput));
  const audit = parse(resolve(auditInput));
  const manifestPayload = structuredClone(manifest);
  delete manifestPayload.system_binding_sha256;
  const decisionPayload = structuredClone(decision);
  delete decisionPayload.decision_sha256;
  delete decisionPayload.approval;
  delete decisionPayload.state;
  if (sha(canonical(manifestPayload)) !== manifest.system_binding_sha256) throw new Error('CAREER-VISUAL-AUDIT-MANIFEST-DRIFT');
  if (sha(canonical(decisionPayload)) !== decision.decision_sha256 || decision.approval?.approved_decision_sha256 !== decision.decision_sha256) throw new Error('CAREER-VISUAL-AUDIT-DECISION-DRIFT');
  if (manifest.decision.decision_sha256 !== decision.decision_sha256 || decision.state !== 'HUMAN_APPROVED') throw new Error('CAREER-VISUAL-AUDIT-BINDING');
  const base = dirname(manifestPath);
  for (const asset of manifest.assets) assertFile(base, asset);
  assertFile(base, {ref: manifest.font_authority.manifest_ref, sha256: manifest.font_authority.manifest_sha256});
  assertFile(base, {ref: manifest.font_authority.rights_ref, sha256: manifest.font_authority.rights_sha256});
  const systemPath = material(base, manifest.contract_ref.ref);
  const system = parse(systemPath);
  if (system.design_system_sha256 !== manifest.contract_ref.design_system_sha256 || decision.design_system_sha256 !== system.design_system_sha256) throw new Error('CAREER-VISUAL-AUDIT-SYSTEM-DRIFT');
  const specPath = material(process.cwd(), audit.spec_ref);
  const spec = parse(specPath);
  const specPayload = structuredClone(spec);
  delete specPayload.spec_sha256;
  delete specPayload.approval;
  delete specPayload.state;
  const variant = spec.variants.find(({variant_id}) => variant_id === audit.variant_id);
  if (spec.schema_version !== 'cv-spec-v2' || sha(canonical(specPayload)) !== spec.spec_sha256 || audit.spec_sha256 !== spec.spec_sha256 || spec.state !== 'HUMAN_APPROVED' || spec.approval?.approved_spec_sha256 !== spec.spec_sha256 || !variant) throw new Error('CAREER-VISUAL-AUDIT-SPEC-DRIFT');
  if (!variant.output_kinds.includes('executive-html') || variant.design_profile === 'candidate-neutral-ats' || variant.design.mode !== 'approved-system' || variant.design.design_system_sha256 !== system.design_system_sha256 || variant.design.decision_sha256 !== decision.decision_sha256 || variant.design.composition_id !== decision.selected_composition) throw new Error('CAREER-VISUAL-AUDIT-VARIANT-BINDING');
  if (audit.design_system_sha256 !== system.design_system_sha256 || audit.decision_sha256 !== decision.decision_sha256 || audit.composition_id !== decision.selected_composition) throw new Error('CAREER-VISUAL-AUDIT-SPEC-BINDING');
  return {audit, manifest, spec, system};
};

export const sha256 = sha;
export const canonicalSha256 = (value) => sha(canonical(value));

const rgba = (text) => {
  const values = (text.match(/[\d.]+/gu) ?? []).slice(0, 4).map(Number);
  return text.startsWith('color(srgb') ? values.slice(0, 3).map((value) => value * 255) : values;
};
const luminance = ([r, g, b]) => [r, g, b].map((value) => {
  const n = value / 255;
  return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
}).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
export const contrastFailures = (pairs) => pairs.filter((pair) => {
  const a = rgba(pair.color); const b = rgba(pair.background);
  if (a.length < 3 || b.length < 3) return true;
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05) < (pair.size >= 24 || (pair.size >= 18.66 && pair.weight >= 700) ? 3 : 4.5);
});

export const auditStaticDom = (page) => page.evaluate(() => {
  const visible = (element) => {
    const style = getComputedStyle(element); const box = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
  };
  const background = (element) => {
    let current = element;
    while (current) {
      const value = getComputedStyle(current).backgroundColor;
      if (!value.endsWith(', 0)') && value !== 'transparent') return value;
      current = current.parentElement;
    }
    return 'rgb(255, 255, 255)';
  };
  const textPairs = [...document.querySelectorAll('body *')].filter((element) => visible(element) && [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim())).map((element) => {
    const style = getComputedStyle(element);
    return {color: style.color, background: background(element), size: parseFloat(style.fontSize), weight: Number(style.fontWeight) || 400};
  });
  const ids = new Set([...document.querySelectorAll('[id]')].map((element) => element.id));
  const ariaBroken = [...document.querySelectorAll('[aria-labelledby],[aria-describedby]')].filter((element) => [...(element.getAttribute('aria-labelledby') ?? '').split(/\s+/u), ...(element.getAttribute('aria-describedby') ?? '').split(/\s+/u)].filter(Boolean).some((id) => !ids.has(id))).length;
  const cards = [...document.querySelectorAll('.career-card')];
  return {
    textPairs, ariaBroken, h1: document.querySelectorAll('h1').length,
    landmarks: document.querySelectorAll('main').length === 1 && document.querySelectorAll('nav[aria-label],nav[aria-labelledby]').length === 1,
    accessCount: document.querySelectorAll('.career-access-list a').length,
    duplicateRails: new Set([...document.querySelectorAll('[data-rail-id]')].map((element) => element.dataset.railId)).size !== document.querySelectorAll('[data-rail-id]').length,
    cardContract: cards.every((card) => card.querySelectorAll('.career-card__bluf').length === 1 && card.querySelectorAll('.career-card__evidence').length === 1),
    capabilityOrder: [...document.querySelectorAll('.career-capability')].every((card) => card.querySelector('.career-capability__title')?.compareDocumentPosition(card.querySelector('.career-capability__category')) === Node.DOCUMENT_POSITION_FOLLOWING),
    rawColor: [...document.querySelectorAll('[style]')].some((element) => /(?:#(?:[\da-f]{3}){1,2}|rgba?\(|hsla?\()/iu.test(element.getAttribute('style'))),
    essential: [...document.querySelectorAll('[data-essential]')].map((element) => [element.dataset.essential, element.textContent.replace(/\s+/gu, ' ').trim()]),
  };
});
