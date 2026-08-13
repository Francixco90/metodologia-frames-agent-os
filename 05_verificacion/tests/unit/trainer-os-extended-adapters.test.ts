import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

import {TrainerExtendedContentSchema} from '../../../02_proceso/workflows/trainer-os/adapter-extended-contracts.ts';
import {
  renderExtendedArtifact,
  validateExtendedPlan,
} from '../../../02_proceso/workflows/trainer-os/adapter-extended-renderers.ts';
import {hashModel} from '../../../02_proceso/workflows/trainer-os/common.ts';
import {TrainerTokenAuthoritySchema} from '../../../02_proceso/workflows/trainer-os/design-assets.schemas.ts';
import {TrainerArtifactPlanV1Schema} from '../../../02_proceso/workflows/trainer-os/trainer-artifact-plan-v1.schema.ts';
import {makeExtendedContent} from './trainer-os-extended-fixture.test.ts';
import {fixture} from './trainer-os-compiler-core.test.ts';
import {verifyExtendedReplay} from './trainer-os-extended-fixture.test.ts';

const binding = (ref: string, digit: string) => ({ref, sha256: digit.repeat(64)});
const bindings = {routeSpec: binding('route.json', 'a'), designLock: binding('lock.json', 'b')};
const theme = TrainerTokenAuthoritySchema.parse(
  JSON.parse(
    readFileSync(resolve('03_artefactos/projects/trainer-os/design/tokens.authority.json'), 'utf8'),
  ),
);
const artifact = (kind: 'playbook' | 'prompt-library', locale = 'es') => ({
  artifactId: `${kind}-${locale}`,
  kind,
  outputRef: `dist/${kind}/${locale}/index.html`,
  acceptanceCriteria: ['Synthetic bytes'],
  ...(kind === 'playbook'
    ? {materializedContentIds: [`${locale}-optional-1`, `${locale}-optional-2`]}
    : {}),
});
const plan = (artifacts: Array<ReturnType<typeof artifact>>) => ({artifacts});
const lock = {selectedDirectionId: 'direction-a'};

describe('trainer playbook and prompt adapters', () => {
  it('builds and verifies extended adapters across isolated roots', () => {
    expect(() => verifyExtendedReplay(fixture)).not.toThrow();
  });
  it('renders twelve essentials, selected optionals and four levels per prompt', () => {
    const source = makeExtendedContent(bindings.routeSpec, bindings.designLock);
    const playbook = renderExtendedArtifact(
      artifact('playbook'),
      source,
      lock as never,
      bindings,
      theme,
    );
    const prompts = renderExtendedArtifact(
      artifact('prompt-library'),
      source,
      lock as never,
      bindings,
      theme,
    );
    expect(playbook?.match(/<section id="es-chapter-/gu)).toHaveLength(12);
    expect(playbook?.match(/<section id="es-optional-/gu)).toHaveLength(2);
    expect(prompts?.match(/<h3>Nivel [1-4]<\/h3>/gu)).toHaveLength(56);
    expect(prompts).toContain('../../playbook/es/index.html#es-step-1');
    expect(prompts).toContain('data-copy-target="es-prompt-1-level-1-body"');
    expect(prompts).toContain('aria-live="polite"');
    expect(prompts).toContain('navigator.clipboard.writeText');
    expect(prompts).toContain('.copy{display:none}');
  });

  it('requires the exact artifact and locale Cartesian product', () => {
    const source = makeExtendedContent(bindings.routeSpec, bindings.designLock, ['es', 'en', 'pt']);
    const complete = ['es', 'en', 'pt'].flatMap((locale) => [
      artifact('playbook', locale),
      artifact('prompt-library', locale),
    ]);
    expect(() => validateExtendedPlan(plan(complete) as never, source)).not.toThrow();
    expect(() => validateExtendedPlan(plan(complete.slice(1)) as never, source)).toThrow(
      'CARTESIAN_DRIFT',
    );
  });

  it.each(['chapters', 'levels', 'step-ref', 'optional-plan', 'stale-hash'] as const)(
    'rejects adversarial %s drift',
    (mode) => {
      const source = structuredClone(
        makeExtendedContent(bindings.routeSpec, bindings.designLock),
      ) as unknown as {
        contentSha256: string;
        locales: {
          es: {
            playbook: {hero: {title: string}; essentialChapters: unknown[]};
            promptLibrary: {prompts: Array<{stepId: string; levels: unknown[]}>};
          };
        };
      };
      const firstPrompt = source.locales.es.promptLibrary.prompts.at(0);
      if (!firstPrompt) throw new Error('synthetic prompt missing');
      if (mode === 'chapters') source.locales.es.playbook.essentialChapters.pop();
      if (mode === 'levels') firstPrompt.levels.pop();
      if (mode === 'step-ref') firstPrompt.stepId = 'missing-step';
      if (mode === 'stale-hash') source.locales.es.playbook.hero.title = 'Mutated after receipt';
      else source.contentSha256 = hashModel(source, 'contentSha256');
      if (mode === 'optional-plan') {
        const broken = artifact('playbook');
        broken.materializedContentIds = ['es-optional-1'];
        expect(() =>
          validateExtendedPlan(plan([broken, artifact('prompt-library')]) as never, source),
        ).toThrow('OPTIONAL_CHAPTER_PLAN_DRIFT');
      } else expect(() => TrainerExtendedContentSchema.parse(source)).toThrow();
    },
  );

  it('forbids materialized content IDs on non-playbook plan artifacts', () => {
    const draft = {
      schemaVersion: 'trainer-artifact-plan-v1',
      planId: 'synthetic-plan',
      planSha256: '',
      routeSpec: bindings.routeSpec,
      designLock: bindings.designLock,
      artifacts: [{...artifact('prompt-library'), materializedContentIds: ['es-optional-1']}],
      maximumState: 'RENDERED_DRAFT',
      publicationAuthority: false,
      progressiveDisclosure: 'focused',
      tokenBudget: {maximum: 1000, estimated: 10, measured: 10},
    };
    const parsedHash = hashModel(draft, 'planSha256');
    expect(() => TrainerArtifactPlanV1Schema.parse({...draft, planSha256: parsedHash})).toThrow();
  });
});
