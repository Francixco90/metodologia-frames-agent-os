import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {describe, expect, it} from 'vitest';

import {
  TrainerAdapterContentSchema,
  TrainerEvidenceAuthorityReceiptSchema,
} from '../../../02_proceso/workflows/trainer-os/adapter-contracts.ts';
import {
  renderAdapterArtifact,
  renderPlannedArtifact,
  validateAdapterPlan,
} from '../../../02_proceso/workflows/trainer-os/adapter-renderers.ts';
import {hashModel} from '../../../02_proceso/workflows/trainer-os/common.ts';
import {
  assertEvidenceAuthorized,
  privacyGate,
} from '../../../02_proceso/workflows/trainer-os/compiler-authority.ts';
import {TrainerTokenAuthoritySchema} from '../../../02_proceso/workflows/trainer-os/design-assets.schemas.ts';

const binding = (ref: string, digit: string) => ({ref, sha256: digit.repeat(64)});
const evidenceIds = ['source-one'];
const localized = (language: 'es' | 'en' | 'pt') => ({
  landing: {
    kind: 'landing',
    title: `${language} Synthetic route`,
    lede: `${language} Local evidence`,
    evidenceIds,
    cta: {
      label: language === 'es' ? 'Abrir ruta' : language === 'pt' ? 'Abrir rota' : 'Open route',
      href: `#${language}-section-1`,
    },
    sections: Array.from({length: 8}, (_, index) => ({
      id: `${language}-section-${index + 1}`,
      title: `${language} Capacity ${index + 1}`,
      body: `${language} Observable evidence ${index + 1}`,
      evidenceIds,
    })),
  },
  workbook: {
    kind: 'workbook',
    hero: {
      title: `${language} Practice`,
      lede: `${language} Guided work`,
      evidenceIds,
      cta: {
        label:
          language === 'es'
            ? 'Iniciar práctica'
            : language === 'pt'
              ? 'Iniciar prática'
              : 'Start practice',
        href: `#${language}-route-1`,
      },
    },
    preparation: [
      {
        id: `${language}-prepare`,
        title: `${language} Inputs`,
        body: `${language} Synthetic inputs`,
        evidenceIds,
      },
    ],
    routes: Array.from({length: 3}, (_, index) => ({
      id: `${language}-route-${index + 1}`,
      title: `${language} Route ${index + 1}`,
      purpose: `${language} Transfer ${index + 1}`,
      evidenceIds,
      steps: [
        {
          id: `${language}-step-${index + 1}`,
          prompt: `${language} Produce evidence ${index + 1}`,
          evidenceIds,
        },
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
    evidence: [
      {
        evidenceId: 'source-one',
        source: binding('source.txt', 'c'),
        authority: 'authored',
        authorityReceipt: binding('authority.json', 'd'),
      },
    ],
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
      expect(output).toContain('MetodologIA · COMPILED');
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
      renderPlannedArtifact(
        artifact('landing'),
        stale,
        route as never,
        lock as never,
        bindings,
        theme,
      ),
    ).toThrow('content hash drift');
  });

  it('blocks noncanonical adapter paths, broken fragments and circular evidence', () => {
    const source = content();
    expect(() =>
      renderPlannedArtifact(
        {...artifact('landing'), outputRef: 'dist/landing-es.html'},
        source,
        route as never,
        lock as never,
        bindings,
        theme,
      ),
    ).toThrow('CANONICAL_PATH_REQUIRED');
    const broken = structuredClone(source);
    broken.locales.es.landing.cta.href = '#missing-target';
    broken.contentSha256 = hashModel(broken, 'contentSha256');
    expect(() =>
      renderPlannedArtifact(
        artifact('landing'),
        broken,
        route as never,
        lock as never,
        bindings,
        theme,
      ),
    ).toThrow('ACCESSIBILITY_BASELINE');
    const item = {
      evidenceId: 'source-one',
      source: binding('adapter-content.json', 'c'),
      authority: 'authored',
    };
    expect(() =>
      assertEvidenceAuthorized(
        [item],
        [item.source],
        [item.source],
        [item],
        ['adapter-content.json'],
      ),
    ).toThrow('EVIDENCE_NOT_AUTHORIZED');
  });

  it('binds authority actors and blocks cross-platform locators and compact PII', () => {
    expect(
      TrainerEvidenceAuthorityReceiptSchema.safeParse({
        schemaVersion: 'trainer-evidence-authority-receipt-v1',
        evidenceId: 'source-one',
        source: binding('source.txt', 'c'),
        authority: 'approved-secondary',
        actor: 'source-registry',
        verdict: 'approved',
        publicationAuthority: false,
      }).success,
    ).toBe(false);
    for (const value of [
      ['/data', 'customer.csv'].join('/'),
      ['~', 'customer.csv'].join('/'),
      ['', '', 'server', 'share', 'customer.csv'].join('\\'),
      ['C:', 'Users', 'person', 'file.txt'].join('\\'),
      ['person', 'example.com'].join('@'),
      ['300', '123', '4567'].join(''),
      '(300) 123-4567',
      '+57(300)1234567',
      '300/123/4567',
      '/secret',
    ])
      expect(() => privacyGate(value)).toThrow('TRAINER_PRIVATE_LOCATOR_OR_PII');
    expect(() => privacyGate('dist/landing/es/index.html')).not.toThrow();
    expect(() => privacyGate('https://example.com/guide')).not.toThrow();
    expect(() => privacyGate('http://localhost:3000/guide')).not.toThrow();
    expect(() => privacyGate('https://example.com/?email=person@example.com')).toThrow();
    expect(() => privacyGate('https://example.com/call/3001234567')).toThrow();
    expect(() => privacyGate('https://person@example.com/guide')).toThrow();
  });
});
