import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  rmdirSync,
  writeFileSync,
} from 'node:fs';
import {basename, dirname, extname, relative, resolve} from 'node:path';

import {calculateSpecSha256, canonicalJson, sha256} from './canonical.ts';
import {
  BuildManifestSchema,
  BuildReceiptSchema,
  HtmlLearningKitSpecSchema,
  type BuildManifest,
  type BuildReceipt,
  type HtmlLearningKitSpec,
  type Locale,
  type LocalizedText,
} from './contracts.ts';
import {assertNoSymlinksInTree, assertSafeOutputRoot, resolveExistingFile} from './paths.ts';

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/gu, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character] ?? character;
  });

const localized = (text: LocalizedText, locale: Locale): string => escapeHtml(text[locale]);
const portable = (value: string): string => value.split('\\').join('/');

const languageLinks = (spec: HtmlLearningKitSpec, kind: string, current: Locale): string =>
  (['es', 'en', 'pt'] as const)
    .map((locale) => {
      const target = spec.outputs.find(
        (output) => output.kind === kind && output.locale === locale,
      );
      if (target === undefined) throw new Error(`MISSING_OUTPUT_TARGET: ${kind}/${locale}`);
      return `<a data-language-link href="/${escapeHtml(target.path)}" lang="${locale}"${locale === current ? ' aria-current="page"' : ''}>${locale.toUpperCase()}</a>`;
    })
    .join(' ');

const commonBehavior = `
    (() => {
      const themeKey = 'theme';
      const saved = localStorage.getItem(themeKey);
      if (saved === 'dark' || saved === 'light') document.documentElement.dataset.theme = saved;
      document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
        const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        localStorage.setItem(themeKey, next);
      });
      document.querySelectorAll('[data-language-link]').forEach((link) => {
        link.addEventListener('click', () => localStorage.setItem('locale', link.lang));
        if (location.hash) link.href += location.hash;
      });
    })();`;

const shell = (input: {
  spec: HtmlLearningKitSpec;
  locale: Locale;
  kind: 'landing' | 'workbook' | 'masterclass';
  title: string;
  body: string;
  behavior?: string;
  stylesheetHref?: string;
}): string => {
  const {spec, locale, kind} = input;
  const stylesheet = input.stylesheetHref
    ? `<link rel="stylesheet" href="${escapeHtml(input.stylesheetHref)}">`
    : '';
  return `<!doctype html>
<html lang="${locale}" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(input.title)}</title>
  ${stylesheet}
</head>
<body data-artifact="${kind}">
  <a class="skip-link" href="#main">${localized(spec.localizedContent.skipLink, locale)}</a>
  <header data-interactive>
    <strong>${localized(spec.localizedContent.siteTitle, locale)}</strong>
    <nav aria-label="Language">${languageLinks(spec, kind, locale)}</nav>
    <button type="button" data-theme-toggle>${localized(spec.localizedContent.themeLabel, locale)}</button>
  </header>
  <main id="main">${input.body}</main>
  <script>${commonBehavior}${input.behavior ?? ''}</script>
</body>
</html>
`;
};

const renderLanding = (spec: HtmlLearningKitSpec, locale: Locale): string => {
  const workbook = spec.outputs.find(
    ({kind, locale: candidate}) => kind === 'workbook' && candidate === locale,
  );
  const masterclass = spec.outputs.find(
    ({kind, locale: candidate}) => kind === 'masterclass' && candidate === locale,
  );
  if (workbook === undefined || masterclass === undefined)
    throw new Error('MISSING_RESOURCE_OUTPUT');
  return `<section class="hero">
    <h1>${localized(spec.localizedContent.landingTitle, locale)}</h1>
    <p>${localized(spec.localizedContent.landingIntroduction, locale)}</p>
  </section>
  <section aria-labelledby="library-title">
    <h2 id="library-title">${localized(spec.localizedContent.libraryTitle, locale)}</h2>
    <ul>
      <li><a href="/${escapeHtml(workbook.path)}">${localized(spec.workbook.title, locale)}</a></li>
      <li><a href="/${escapeHtml(masterclass.path)}">${localized(spec.masterclass.title, locale)}</a></li>
    </ul>
  </section>`;
};

const workbookBehavior = `
    (() => {
      const tabs = [...document.querySelectorAll('[role="tab"]')];
      document.querySelector('[role="tablist"]')?.addEventListener('keydown', (event) => {
        const current = tabs.indexOf(document.activeElement);
        if (current < 0) return;
        let next = current;
        if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault();
        tabs[next].focus();
      });
      document.querySelectorAll('[data-copy-target]').forEach((button) => {
        button.addEventListener('click', async () => {
          const target = document.getElementById(button.dataset.copyTarget);
          if (target) await navigator.clipboard.writeText(target.textContent || '');
        });
      });
    })();`;

const renderWorkbook = (spec: HtmlLearningKitSpec, locale: Locale): string => {
  const tabs = spec.workbook.sheets
    .map(
      (sheet) =>
        `<a role="tab" href="#sheet-${sheet.sheetId}">${localized(sheet.label, locale)}</a>`,
    )
    .join('');
  const sheets = spec.workbook.sheets
    .map(
      (sheet) => `<section id="sheet-${sheet.sheetId}" tabindex="-1">
      <h2>${localized(sheet.label, locale)}</h2>
      <p>${localized(sheet.purpose, locale)}</p>
      <p><strong>${localized(sheet.outcome, locale)}</strong></p>
      ${sheet.steps
        .map((step) => {
          const promptId = `prompt-${sheet.sheetId}-${step.stepId}`;
          return `<article id="step-${step.stepId}">
        <h3>${localized(step.title, locale)}</h3>
        <p>${localized(step.body, locale)}</p>
        <pre id="${promptId}"><code>${localized(step.prompt, locale)}</code></pre>
        <button data-interactive type="button" data-copy-target="${promptId}">Copy</button>
        <p>${localized(step.evidence, locale)}</p>
      </article>`;
        })
        .join('')}
    </section>`,
    )
    .join('');
  return `<h1>${localized(spec.workbook.title, locale)}</h1>
  <p>${localized(spec.workbook.introduction, locale)}</p>
  <nav data-interactive role="tablist" aria-label="Workbook">${tabs}</nav>${sheets}`;
};

const masterclassBehavior = `
    (() => {
      const slides = [...document.querySelectorAll('[data-slide]')];
      const progress = document.querySelector('[data-progress]');
      let index = Math.max(0, slides.findIndex((slide) => '#' + slide.id === location.hash));
      const show = (next) => {
        index = Math.max(0, Math.min(slides.length - 1, next));
        slides.forEach((slide, position) => { slide.hidden = position !== index; });
        if (progress) progress.value = index + 1;
        history.replaceState(null, '', '#' + slides[index].id);
        slides[index].focus();
      };
      document.querySelector('[data-previous]')?.addEventListener('click', () => show(index - 1));
      document.querySelector('[data-next]')?.addEventListener('click', () => show(index + 1));
      document.addEventListener('keydown', (event) => {
        if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
        if (['ArrowRight', 'PageDown', ' ', 'Space'].includes(event.key)) show(index + 1);
        else if (['ArrowLeft', 'PageUp'].includes(event.key)) show(index - 1);
        else if (event.key === 'Home') show(0);
        else if (event.key === 'End') show(slides.length - 1);
        else return;
        event.preventDefault();
      });
      show(index);
    })();`;

const renderMasterclass = (spec: HtmlLearningKitSpec, locale: Locale): string => {
  const workbook = spec.outputs.find(
    ({kind, locale: candidate}) => kind === 'workbook' && candidate === locale,
  );
  if (workbook === undefined) throw new Error('MISSING_WORKBOOK_OUTPUT');
  const outline = spec.masterclass.slides
    .map(
      (slide, index) =>
        `<li><a href="#slide-${slide.slideId}">${index + 1}. ${localized(slide.title, locale)}</a></li>`,
    )
    .join('');
  const slides = spec.masterclass.slides
    .map((slide, index) => {
      const resource = slide.workbookTarget
        ? `<a href="/${escapeHtml(workbook.path)}#step-${escapeHtml(slide.workbookTarget.stepId)}">Workbook</a>`
        : '';
      return `<section class="slide" id="slide-${slide.slideId}" data-slide="${index + 1}" tabindex="-1">
      <p>${index + 1} / ${spec.masterclass.slides.length} · ${slide.timing.coreMinutes}/${slide.timing.extendedMinutes} min</p>
      <h2>${localized(slide.title, locale)}</h2>
      <p>${localized(slide.body, locale)}</p>
      <aside>${localized(slide.facilitatorNote, locale)}</aside>${resource}
    </section>`;
    })
    .join('');
  return `<h1>${localized(spec.masterclass.title, locale)}</h1>
  <p>${localized(spec.masterclass.introduction, locale)}</p>
  <p>${spec.masterclass.modes.map(({id, minutes}) => `${id}: ${minutes}`).join(' · ')}</p>
  <nav data-interactive aria-label="Outline"><ol>${outline}</ol></nav>
  <progress data-interactive data-progress max="${spec.masterclass.slides.length}" value="1"></progress>
  ${slides}
  <div data-interactive><button type="button" data-previous>Previous</button><button type="button" data-next>Next</button></div>`;
};

export type CompileLearningKitOptions = {
  workspaceRoot: string;
  outputRoot: string;
  spec: HtmlLearningKitSpec;
};

type Preflight = {
  spec: HtmlLearningKitSpec;
  resolvedInputs: Map<string, string>;
};

const preflight = (options: CompileLearningKitOptions): Preflight => {
  const spec = HtmlLearningKitSpecSchema.parse(options.spec);
  if (calculateSpecSha256(spec) !== spec.specSha256) throw new Error('STALE_SPEC_HASH');
  const outputKeys = new Set(spec.outputs.map(({kind, locale}) => `${kind}:${locale}`));
  const outputPaths = new Set(spec.outputs.map(({path}) => path));
  if (outputKeys.size !== 9 || outputPaths.size !== 9) throw new Error('INCOMPLETE_OUTPUT_MATRIX');
  if (new Set(spec.assets.map(({assetId}) => assetId)).size !== spec.assets.length) {
    throw new Error('DUPLICATE_ASSET_ID');
  }
  const sheetIds = new Set<string>();
  const stepIds = new Set<string>();
  for (const sheet of spec.workbook.sheets) {
    if (sheetIds.has(sheet.sheetId)) throw new Error(`DUPLICATE_SHEET_ID: ${sheet.sheetId}`);
    sheetIds.add(sheet.sheetId);
    for (const step of sheet.steps) {
      if (stepIds.has(step.stepId)) throw new Error(`DUPLICATE_STEP_ID: ${step.stepId}`);
      stepIds.add(step.stepId);
    }
  }
  const slideIds = new Set<string>();
  for (const slide of spec.masterclass.slides) {
    if (slideIds.has(slide.slideId)) throw new Error(`DUPLICATE_SLIDE_ID: ${slide.slideId}`);
    slideIds.add(slide.slideId);
    if (
      slide.workbookTarget !== undefined &&
      (!sheetIds.has(slide.workbookTarget.sheetId) || !stepIds.has(slide.workbookTarget.stepId))
    ) {
      throw new Error(`INVALID_WORKBOOK_TARGET: ${slide.slideId}`);
    }
  }

  const resolvedInputs = new Map<string, string>();
  const verifyBinding = (binding: {ref: string; sha256: string}, code: string): void => {
    const path = resolveExistingFile(options.workspaceRoot, binding.ref);
    if (sha256(readFileSync(path)) !== binding.sha256) throw new Error(`${code}: ${binding.ref}`);
    resolvedInputs.set(binding.ref, path);
  };
  verifyBinding(spec.designSystemLock, 'STALE_DESIGN_SYSTEM_LOCK');
  verifyBinding(spec.brandAuthority, 'STALE_BRAND_AUTHORITY');
  for (const asset of spec.assets) {
    verifyBinding(asset.source, 'STALE_ASSET_HASH');
    verifyBinding(asset.rights.evidence, 'STALE_RIGHTS_EVIDENCE');
  }
  assertSafeOutputRoot(options.outputRoot);
  assertNoSymlinksInTree(options.outputRoot);
  return {spec, resolvedInputs};
};

const materialize = (
  stageRoot: string,
  preflightResult: Preflight,
): {manifest: BuildManifest; receipt: BuildReceipt} => {
  const {spec, resolvedInputs} = preflightResult;
  const manifestAssets = spec.assets
    .slice()
    .sort((left, right) => left.assetId.localeCompare(right.assetId))
    .map((asset) => {
      const suffix = extname(asset.source.ref);
      const outputPath = `assets/${asset.assetId}${suffix}`;
      const destination = resolve(stageRoot, outputPath);
      mkdirSync(dirname(destination), {recursive: true});
      copyFileSync(resolvedInputs.get(asset.source.ref)!, destination);
      return {
        assetId: asset.assetId,
        sourceSha256: asset.source.sha256,
        outputPath,
        outputSha256: sha256(readFileSync(destination)),
      };
    });

  const stylesheetAsset = manifestAssets.find(({outputPath}) => outputPath.endsWith('.css'));
  const outputs = spec.outputs
    .slice()
    .sort((left, right) => left.path.localeCompare(right.path))
    .map((target) => {
      const destination = resolve(stageRoot, target.path);
      mkdirSync(dirname(destination), {recursive: true});
      const stylesheetHref = stylesheetAsset
        ? portable(relative(dirname(destination), resolve(stageRoot, stylesheetAsset.outputPath)))
        : undefined;
      const body =
        target.kind === 'landing'
          ? renderLanding(spec, target.locale)
          : target.kind === 'workbook'
            ? renderWorkbook(spec, target.locale)
            : renderMasterclass(spec, target.locale);
      const behavior =
        target.kind === 'workbook'
          ? workbookBehavior
          : target.kind === 'masterclass'
            ? masterclassBehavior
            : undefined;
      const title =
        target.kind === 'landing'
          ? spec.localizedContent.landingTitle[target.locale]
          : target.kind === 'workbook'
            ? spec.workbook.title[target.locale]
            : spec.masterclass.title[target.locale];
      const shellInput = {spec, locale: target.locale, kind: target.kind, title, body};
      writeFileSync(
        destination,
        shell({
          ...shellInput,
          ...(behavior === undefined ? {} : {behavior}),
          ...(stylesheetHref === undefined ? {} : {stylesheetHref}),
        }),
      );
      return {...target, sha256: sha256(readFileSync(destination))};
    });

  const unsignedManifest = {
    schemaVersion: 'html-learning-kit-build-manifest-v1' as const,
    specId: spec.specId,
    specSha256: spec.specSha256,
    designSystemSha256: spec.designSystemLock.sha256,
    brandAuthoritySha256: spec.brandAuthority.sha256,
    compilerVersion: 'html-learning-kit-compiler-v1' as const,
    assets: manifestAssets,
    outputs,
  };
  const manifest = BuildManifestSchema.parse({
    ...unsignedManifest,
    manifestSha256: sha256(canonicalJson(unsignedManifest)),
  });
  writeFileSync(resolve(stageRoot, 'build-manifest.json'), canonicalJson(manifest));
  const unsignedReceipt = {
    schemaVersion: 'html-learning-kit-build-receipt-v1' as const,
    receiptId: `RCP-${spec.specId}-BUILD-001`,
    specId: spec.specId,
    specSha256: spec.specSha256,
    designSystemSha256: spec.designSystemLock.sha256,
    manifestSha256: manifest.manifestSha256,
    outputSetSha256: sha256(canonicalJson(outputs)),
    state: 'RENDERED_DRAFT' as const,
    publicationAuthority: false as const,
  };
  const receipt = BuildReceiptSchema.parse({
    ...unsignedReceipt,
    receiptSha256: sha256(canonicalJson(unsignedReceipt)),
  });
  writeFileSync(resolve(stageRoot, 'build-receipt.json'), canonicalJson(receipt));
  return {manifest, receipt};
};

const promote = (stageRoot: string, outputRoot: string): void => {
  const parent = dirname(outputRoot);
  let backupRoot: string | undefined;
  try {
    if (existsSync(outputRoot)) {
      backupRoot = mkdtempSync(resolve(parent, `.${basename(outputRoot)}.backup-`));
      rmdirSync(backupRoot);
      renameSync(outputRoot, backupRoot);
    }
    renameSync(stageRoot, outputRoot);
    if (backupRoot !== undefined) rmSync(backupRoot, {recursive: true, force: true});
  } catch (error) {
    if (existsSync(stageRoot)) rmSync(stageRoot, {recursive: true, force: true});
    if (backupRoot !== undefined && existsSync(backupRoot) && !existsSync(outputRoot)) {
      renameSync(backupRoot, outputRoot);
    }
    throw error;
  }
};

export const compileLearningKit = (
  options: CompileLearningKitOptions,
): {manifest: BuildManifest; receipt: BuildReceipt} => {
  const checked = preflight(options);
  const outputRoot = resolve(options.outputRoot);
  const parent = dirname(outputRoot);
  mkdirSync(parent, {recursive: true});
  const stageRoot = mkdtempSync(resolve(parent, `.${basename(outputRoot)}.stage-`));
  try {
    const result = materialize(stageRoot, checked);
    promote(stageRoot, outputRoot);
    return result;
  } catch (error) {
    if (existsSync(stageRoot)) rmSync(stageRoot, {recursive: true, force: true});
    throw error;
  }
};
