import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {describe, expect, it} from 'vitest';

import {TrainerAdapterContentSchema} from '../../../02_proceso/workflows/trainer-os/adapter-contracts.ts';
import {
  renderAdapterArtifact,
  validateAdapterPlan,
} from '../../../02_proceso/workflows/trainer-os/adapter-renderers.ts';
import {hashModel} from '../../../02_proceso/workflows/trainer-os/common.ts';
import {TrainerCompilerAuthorityFiles} from '../../../02_proceso/workflows/trainer-os/compiler-contracts.ts';
import {TrainerTokenAuthoritySchema} from '../../../02_proceso/workflows/trainer-os/design-assets.schemas.ts';

const binding = (ref: string, digit: string) => ({ref, sha256: digit.repeat(64)});
const localized = (language: 'es' | 'en' | 'pt') => ({
  landing: {
    kind: 'landing',
    title: `${language} Synthetic route`,
    lede: `${language} Local evidence`,
    cta: {
      label: language === 'es' ? 'Abrir ruta' : language === 'pt' ? 'Abrir rota' : 'Open route',
      href: '/resource',
    },
    sections: Array.from({length: 8}, (_, index) => ({
      id: `${language}-section-${index + 1}`,
      title: `${language} Capacity ${index + 1}`,
      body: `${language} Observable evidence ${index + 1}`,
    })),
  },
  workbook: {
    kind: 'workbook',
    hero: {
      title: `${language} Practice`,
      lede: `${language} Guided work`,
      cta: {
        label:
          language === 'es'
            ? 'Iniciar práctica'
            : language === 'pt'
              ? 'Iniciar prática'
              : 'Start practice',
        href: '/practice',
      },
    },
    preparation: [
      {
        id: `${language}-prepare`,
        title: `${language} Inputs`,
        body: `${language} Synthetic inputs`,
      },
    ],
    routes: Array.from({length: 3}, (_, index) => ({
      id: `${language}-route-${index + 1}`,
      title: `${language} Route ${index + 1}`,
      purpose: `${language} Transfer ${index + 1}`,
      steps: [
        {id: `${language}-step-${index + 1}`, prompt: `${language} Produce evidence ${index + 1}`},
      ],
    })),
  },
});
const content = (locales: Array<'es' | 'en' | 'pt'> = ['es']) => {
  const value = {
    schemaVersion: 'trainer-adapter-content-v1',
    contentId: 'synthetic-content',
    contentSha256: '',
    routeSpec: binding('route.json', 'a'),
    designLock: binding('lock.json', 'b'),
    locales: {
      es: localized('es'),
      ...(locales.includes('en') ? {en: localized('en')} : {}),
      ...(locales.includes('pt') ? {pt: localized('pt')} : {}),
    },
    requestedLocales: locales,
    brandId: 'metodologia',
    publicationAuthority: false,
  };
  return {...value, contentSha256: hashModel(value, 'contentSha256')};
};
const theme = TrainerTokenAuthoritySchema.parse(
  JSON.parse(
    readFileSync(resolve('03_artefactos/projects/trainer-os/design/tokens.authority.json'), 'utf8'),
  ),
);
const route = {locale: 'es', purpose: 'Synthetic'};
const lock = {selectedDirectionId: 'direction-a'};
const bindings = {routeSpec: binding('route.json', 'a'), designLock: binding('lock.json', 'b')};
const artifact = (kind: 'landing' | 'workbook', locale = 'es') => ({
  artifactId: `${kind}-${locale}`,
  kind,
  outputRef: `dist/${kind}/${locale}/index.html`,
  acceptanceCriteria: ['Synthetic bytes'],
});
const plan = (artifacts: Array<ReturnType<typeof artifact>>) => ({artifacts});

describe('trainer HTML adapters', () => {
  it('renders exactly eight landing sections and three workbook routes from locked tokens', () => {
    const source = content();
    const landing = renderAdapterArtifact(
      artifact('landing'),
      source,
      route as never,
      lock as never,
      bindings,
      theme,
    );
    const workbook = renderAdapterArtifact(
      artifact('workbook'),
      source,
      route as never,
      lock as never,
      bindings,
      theme,
    );
    expect(landing?.match(/<section\b/gu)).toHaveLength(8);
    expect(workbook?.match(/<section id="es-route-/gu)).toHaveLength(3);
    for (const output of [landing, workbook]) {
      expect(output).toContain('data-design-direction="direction-a"');
      expect(output).toContain(`--gold:${theme.colors.gold}`);
      expect(output).toContain(`--paper:${theme.colors.darkCanvas}`);
      expect(output).toContain('overflow-wrap:anywhere');
      expect(output).toContain('@media print');
      expect(output).toContain('<svg aria-hidden="true"');
      expect(output).not.toContain('<script');
    }
  });

  it('localizes chrome and binds the exact locale set to planned outputs', () => {
    const source = content(['es', 'en', 'pt']);
    validateAdapterPlan(
      plan(
        ['es', 'en', 'pt'].flatMap((locale) => [
          artifact('landing', locale),
          artifact('workbook', locale),
        ]),
      ) as never,
      source,
    );
    const pt = renderAdapterArtifact(
      artifact('workbook', 'pt'),
      source,
      route as never,
      lock as never,
      bindings,
      theme,
    );
    expect(pt).toContain('Preparação');
    expect(pt).toContain('Pular');
    expect(pt).toContain('CADERNO · 3');
    expect(pt).not.toContain('Route evidence');
    expect(() => validateAdapterPlan(plan([artifact('landing', 'es')]) as never, source)).toThrow(
      'LOCALE_DRIFT',
    );
    expect(() =>
      validateAdapterPlan(
        plan(['es', 'en', 'pt'].map((locale) => artifact('landing', locale))) as never,
        source,
      ),
    ).toThrow('CARTESIAN_DRIFT');
  });

  it.each(['sections', 'cta', 'duplicate-id', 'locale'] as const)(
    'rejects adversarial %s content',
    (mode) => {
      const value = structuredClone(content()) as unknown as {
        contentSha256: string;
        requestedLocales: string[];
        locales: {
          es: {
            landing: {sections: unknown[]; cta: {label: string}};
            workbook: {routes: Array<{steps: Array<{id: string}>}>};
          };
        };
      };
      if (mode === 'sections') value.locales.es.landing.sections.pop();
      if (mode === 'cta') value.locales.es.landing.cta.label = 'This call to action';
      if (mode === 'duplicate-id') {
        const step = value.locales.es.workbook.routes.at(0)?.steps.at(0);
        if (!step) throw new Error('synthetic workbook step missing');
        step.id = 'es-prepare';
      }
      if (mode === 'locale') value.requestedLocales = ['es', 'en'];
      value.contentSha256 = hashModel(value, 'contentSha256');
      expect(() => TrainerAdapterContentSchema.parse(value)).toThrow();
    },
  );

  it('rejects unsafe theme fields and produces identical bytes cross-process', () => {
    expect(TrainerCompilerAuthorityFiles).toContain('design-assets.schemas.ts');
    expect(() =>
      TrainerTokenAuthoritySchema.parse({
        ...theme,
        colors: {...theme.colors, navy: 'url(https://invalid.example)'},
      }),
    ).toThrow();
    const source = content();
    const expected = renderAdapterArtifact(
      artifact('landing'),
      source,
      route as never,
      lock as never,
      bindings,
      theme,
    );
    const moduleUrl = new URL(
      '../../../02_proceso/workflows/trainer-os/adapter-renderers.ts',
      import.meta.url,
    ).href;
    const script = `import {renderAdapterArtifact} from ${JSON.stringify(moduleUrl)};const x=JSON.parse(process.env.TRAINER_ADAPTER_INPUT);process.stdout.write(renderAdapterArtifact(x.artifact,x.source,x.route,x.lock,x.bindings,x.theme));`;
    const replay = spawnSync(
      process.execPath,
      ['--import', 'tsx', '--input-type=module', '--eval', script],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          TRAINER_ADAPTER_INPUT: JSON.stringify({
            artifact: artifact('landing'),
            source,
            route,
            lock,
            bindings,
            theme,
          }),
        },
      },
    );
    expect(replay.status, replay.stderr).toBe(0);
    expect(replay.stdout).toBe(expected);
  });

  it('rejects stale content hashes before rendering', () => {
    const stale = content();
    stale.locales.es.landing.title = 'Mutated after receipt';
    expect(() =>
      renderAdapterArtifact(
        artifact('landing'),
        stale,
        route as never,
        lock as never,
        bindings,
        theme,
      ),
    ).toThrow('content hash drift');
  });
});
