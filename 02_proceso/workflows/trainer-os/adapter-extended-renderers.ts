import {canonicalJson} from './common.ts';
import {
  TrainerExtendedContentSchema,
  type TrainerExtendedLocale,
} from './adapter-extended-contracts.ts';
import {
  copyAffordance,
  copyEnhancement,
  cta,
  html,
  shell,
  type AdapterTheme,
} from './adapter-shell.ts';
import type {TrainerArtifactPlanV1} from './trainer-artifact-plan-v1.schema.ts';
import type {TrainerDesignLockV1} from './trainer-design-lock-v1.schema.ts';

type Artifact = TrainerArtifactPlanV1['artifacts'][number];
type Binding = {ref: string; sha256: string};
const pattern = /^dist\/(playbook|prompt-library)\/(es|en|pt)\/index\.html$/u;
const chrome = {
  es: {
    skip: 'Saltar',
    playbook: 'PLAYBOOK',
    prompts: 'PROMPTS',
    copy: 'Copiar prompt',
    copied: 'Prompt copiado',
    fallback: 'Texto seleccionado; copia manualmente',
    level: 'Nivel',
  },
  en: {
    skip: 'Skip',
    playbook: 'PLAYBOOK',
    prompts: 'PROMPTS',
    copy: 'Copy prompt',
    copied: 'Prompt copied',
    fallback: 'Text selected; copy manually',
    level: 'Level',
  },
  pt: {
    skip: 'Pular',
    playbook: 'PLAYBOOK',
    prompts: 'PROMPTS',
    copy: 'Copiar prompt',
    copied: 'Prompt copiado',
    fallback: 'Texto selecionado; copie manualmente',
    level: 'Nível',
  },
} as const;
const playbook = (
  locale: keyof typeof chrome,
  content: TrainerExtendedLocale,
  lock: TrainerDesignLockV1,
  theme: AdapterTheme,
  selected: string[],
) => {
  const piece = content.playbook;
  const optional = piece.optionalChapters.filter(({id}) => selected.includes(id));
  const chapters = [...piece.essentialChapters, ...optional]
    .map(
      ({id, title, purpose, steps}) =>
        `<section id="${id}" class="route"><h2>${html(title)}</h2><p>${html(purpose)}</p><ol>${steps.map((step) => `<li id="${step.id}"><h3>${html(step.title)}</h3><p>${html(step.instruction)}</p></li>`).join('')}</ol></section>`,
    )
    .join('');
  return shell(
    locale,
    piece.hero.title,
    `<div class="hero"><p>${chrome[locale].playbook} · 12${optional.length ? ` + ${optional.length}` : ''}</p><h1>${html(piece.hero.title)}</h1><p class="lede">${html(piece.hero.lede)}</p>${cta(piece.hero.cta.label, piece.hero.cta.href)}</div>${chapters}`,
    chrome[locale].skip,
    lock.selectedDirectionId,
    theme,
  );
};
const prompts = (
  locale: keyof typeof chrome,
  content: TrainerExtendedLocale,
  lock: TrainerDesignLockV1,
  theme: AdapterTheme,
) => {
  const piece = content.promptLibrary;
  const items = piece.prompts
    .map(
      ({id, stepId, title, levels}) =>
        `<section id="${id}" class="route" aria-labelledby="${id}-title"><h2 id="${id}-title">${html(title)}</h2><p><a href="../../playbook/${locale}/index.html#${stepId}">${html(stepId)}</a></p>${levels.map(({level, body}) => `<article id="${id}-level-${level}" class="prompt"><h3>${chrome[locale].level} ${level}</h3><p id="${id}-level-${level}-body">${html(body)}</p>${copyAffordance(`${id}-level-${level}-body`, chrome[locale].copy)}</article>`).join('')}</section>`,
    )
    .join('');
  return shell(
    locale,
    piece.hero.title,
    `<div class="hero"><p>${chrome[locale].prompts} · 4</p><h1>${html(piece.hero.title)}</h1><p class="lede">${html(piece.hero.lede)}</p>${cta(piece.hero.cta.label, piece.hero.cta.href)}</div>${items}`,
    chrome[locale].skip,
    lock.selectedDirectionId,
    theme,
    copyEnhancement(chrome[locale].copied, chrome[locale].fallback),
  );
};

export const validateExtendedPlan = (plan: TrainerArtifactPlanV1, raw: unknown) => {
  const adapted = plan.artifacts.flatMap((artifact) => {
    const match = pattern.exec(artifact.outputRef);
    return match ? [{kind: match[1], locale: match[2], artifact}] : [];
  });
  if (!adapted.length) return undefined;
  const source = TrainerExtendedContentSchema.parse(raw);
  const actual = adapted.map(({kind, locale}) => `${kind}:${locale}`).sort();
  const expected = source.requestedLocales
    .flatMap((locale) => [`playbook:${locale}`, `prompt-library:${locale}`])
    .sort();
  if (canonicalJson(actual) !== canonicalJson(expected))
    throw new Error('TRAINER_EXTENDED_PLAN_CARTESIAN_DRIFT');
  for (const {kind, locale, artifact} of adapted) {
    if (artifact.kind !== kind) throw new Error('TRAINER_EXTENDED_KIND_PATH_MISMATCH');
    const content = source.locales[locale as 'es' | 'en' | 'pt'];
    if (!content) throw new Error(`TRAINER_EXTENDED_LOCALE_MISSING:${locale}`);
    const selected = artifact.materializedContentIds ?? [];
    const optional = content.playbook.optionalChapters.map(({id}) => id).sort();
    if (kind === 'playbook' && canonicalJson([...selected].sort()) !== canonicalJson(optional))
      throw new Error('TRAINER_OPTIONAL_CHAPTER_PLAN_DRIFT');
    if (kind === 'prompt-library' && selected.length)
      throw new Error('TRAINER_PROMPT_MATERIALIZATION_FORBIDDEN');
  }
  return source;
};

export const renderExtendedArtifact = (
  artifact: Artifact,
  raw: unknown,
  lock: TrainerDesignLockV1,
  bindings: {routeSpec: Binding; designLock: Binding},
  theme: AdapterTheme | undefined,
) => {
  const match = pattern.exec(artifact.outputRef);
  if (!match) return undefined;
  const [, kind, locale] = match;
  if (!kind || !locale || !theme) throw new Error('TRAINER_EXTENDED_RENDER_INPUT_MISSING');
  const source = TrainerExtendedContentSchema.parse(raw);
  if (
    canonicalJson(source.routeSpec) !== canonicalJson(bindings.routeSpec) ||
    canonicalJson(source.designLock) !== canonicalJson(bindings.designLock)
  )
    throw new Error('TRAINER_EXTENDED_CONTENT_BINDING_DRIFT');
  const content = source.locales[locale as 'es' | 'en' | 'pt'];
  if (!content) throw new Error(`TRAINER_EXTENDED_LOCALE_MISSING:${locale}`);
  const selectedLocale = locale as keyof typeof chrome;
  return kind === 'playbook'
    ? playbook(selectedLocale, content, lock, theme, artifact.materializedContentIds ?? [])
    : prompts(selectedLocale, content, lock, theme);
};

export const ExtendedAdapterRegistry = Object.freeze({
  playbook: {essential: 12, optionalMaximum: 7},
  promptLibrary: {levels: 4},
});
