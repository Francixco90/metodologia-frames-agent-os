import {canonicalJson} from './common.ts';
import {TrainerAdapterContentSchema, type TrainerLocaleContent} from './adapter-contracts.ts';
import {cta, html, shell, type AdapterTheme} from './adapter-shell.ts';
import type {TrainerArtifactPlanV1} from './trainer-artifact-plan-v1.schema.ts';
import type {TrainerDesignLockV1} from './trainer-design-lock-v1.schema.ts';
import type {TrainerRouteSpecV1} from './trainer-route-spec-v1.schema.ts';

type Artifact = TrainerArtifactPlanV1['artifacts'][number];
type Binding = {ref: string; sha256: string};
const routePattern = /^dist\/(landing|workbook)\/(es|en|pt)\/index\.html$/u;
const chrome = {
  es: {
    skip: 'Saltar',
    evidence: 'Evidencia de ruta',
    prepare: 'Preparación',
    landing: 'RUTA',
    workbook: 'CUADERNO',
  },
  en: {
    skip: 'Skip',
    evidence: 'Route evidence',
    prepare: 'Preparation',
    landing: 'ROUTE',
    workbook: 'WORKBOOK',
  },
  pt: {
    skip: 'Pular',
    evidence: 'Evidência da rota',
    prepare: 'Preparação',
    landing: 'ROTA',
    workbook: 'CADERNO',
  },
} as const;
const landing = (
  locale: keyof typeof chrome,
  content: TrainerLocaleContent,
  lock: TrainerDesignLockV1,
  theme: AdapterTheme,
) => {
  const piece = content.landing;
  const sections = piece.sections
    .map(
      ({id, title, body}) =>
        `<section id="${id}" class="card"><h2>${html(title)}</h2><p>${html(body)}</p></section>`,
    )
    .join('');
  return shell(
    locale,
    piece.title,
    `<div class="hero"><p>${chrome[locale].landing} · 8</p><h1>${html(piece.title)}</h1><p class="lede">${html(piece.lede)}</p>${cta(piece.cta.label, piece.cta.href)}</div><div class="grid">${sections}</div><aside class="route" aria-label="${chrome[locale].evidence}">${html(piece.lede)}</aside>`,
    chrome[locale].skip,
    lock.selectedDirectionId,
    theme,
  );
};

const workbook = (
  locale: keyof typeof chrome,
  content: TrainerLocaleContent,
  lock: TrainerDesignLockV1,
  theme: AdapterTheme,
) => {
  const piece = content.workbook;
  const preparation = piece.preparation
    .map(
      ({id, title, body}) =>
        `<article id="${id}" class="card"><h2>${html(title)}</h2><p>${html(body)}</p></article>`,
    )
    .join('');
  const routes = piece.routes
    .map(
      ({id, title, purpose, steps}) =>
        `<section id="${id}" class="route"><h2>${html(title)}</h2><p>${html(purpose)}</p>${steps.map(({id: stepId, prompt}) => `<article id="${stepId}" class="prompt"><h3>${html(stepId)}</h3><p>${html(prompt)}</p></article>`).join('')}</section>`,
    )
    .join('');
  return shell(
    locale,
    piece.hero.title,
    `<div class="hero"><p>${chrome[locale].workbook} · 3</p><h1>${html(piece.hero.title)}</h1><p class="lede">${html(piece.hero.lede)}</p>${cta(piece.hero.cta.label, piece.hero.cta.href)}</div><section aria-labelledby="prepare"><h2 id="prepare">${chrome[locale].prepare}</h2><div class="grid">${preparation}</div></section>${routes}`,
    chrome[locale].skip,
    lock.selectedDirectionId,
    theme,
  );
};

export const renderAdapterArtifact = (
  artifact: Artifact,
  raw: unknown,
  route: TrainerRouteSpecV1,
  lock: TrainerDesignLockV1,
  bindings: {routeSpec: Binding; designLock: Binding},
  theme: AdapterTheme | undefined,
) => {
  const match = routePattern.exec(artifact.outputRef);
  if (!match) return undefined;
  const [, kind, locale] = match;
  if (!kind || !locale) throw new Error('TRAINER_ADAPTER_PATH_INVALID');
  if (artifact.kind !== kind) throw new Error('TRAINER_ADAPTER_KIND_PATH_MISMATCH');
  const source = TrainerAdapterContentSchema.parse(raw);
  if (!theme) throw new Error('TRAINER_ADAPTER_THEME_MISSING');
  if (
    canonicalJson(source.routeSpec) !== canonicalJson(bindings.routeSpec) ||
    canonicalJson(source.designLock) !== canonicalJson(bindings.designLock)
  )
    throw new Error('TRAINER_ADAPTER_CONTENT_BINDING_DRIFT');
  const content = source.locales[locale as 'es' | 'en' | 'pt'];
  if (!content) throw new Error(`TRAINER_ADAPTER_LOCALE_MISSING:${locale}`);
  const selectedLocale = locale as keyof typeof chrome;
  return kind === 'landing'
    ? landing(selectedLocale, content, lock, theme)
    : workbook(selectedLocale, content, lock, theme);
};

export const validateAdapterPlan = (plan: TrainerArtifactPlanV1, raw: unknown) => {
  const adapted = plan.artifacts.flatMap((artifact) => {
    const match = routePattern.exec(artifact.outputRef);
    return match ? [{kind: match[1], locale: match[2], artifact}] : [];
  });
  if (!adapted.length) return undefined;
  const source = TrainerAdapterContentSchema.parse(raw);
  const actual = [...new Set(adapted.map(({locale}) => locale))].sort();
  const expected = [...source.requestedLocales].sort();
  if (canonicalJson(actual) !== canonicalJson(expected))
    throw new Error('TRAINER_ADAPTER_PLAN_LOCALE_DRIFT');
  const keys = adapted.map(({kind, locale}) => `${kind}:${locale}`).sort();
  const cartesian = source.requestedLocales
    .flatMap((locale) => [`landing:${locale}`, `workbook:${locale}`])
    .sort();
  if (canonicalJson(keys) !== canonicalJson(cartesian))
    throw new Error('TRAINER_ADAPTER_PLAN_CARTESIAN_DRIFT');
  return source;
};

export const renderPlannedArtifact = (
  artifact: Artifact,
  raw: unknown,
  route: TrainerRouteSpecV1,
  lock: TrainerDesignLockV1,
  bindings: {routeSpec: Binding; designLock: Binding},
  theme: AdapterTheme | undefined,
) => {
  const adapted =
    raw === undefined
      ? undefined
      : renderAdapterArtifact(artifact, raw, route, lock, bindings, theme);
  if (adapted) return adapted;
  if (routePattern.test(artifact.outputRef)) throw new Error('TRAINER_ADAPTER_CONTENT_MISSING');
  return `<!doctype html>\n<html lang="${route.locale}"><meta charset="utf-8"><title>${html(route.purpose)}</title><main data-compiler="trainer-core"><h1>${html(route.purpose)}</h1><p>${html(lock.selectedDirectionId)}</p><small>${html(artifact.artifactId)} · MetodologIA</small></main>\n`;
};

export const AdapterRegistry = Object.freeze({landing: {sections: 8}, workbook: {routes: 3}});
