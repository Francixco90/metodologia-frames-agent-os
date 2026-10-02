import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {
  AulaBuildBindingV1Schema,
  AulaBuildPlanV1Schema,
} from '../../../02_proceso/workflows/multimedia/_schema/aula-dependencies-v1.ts';
import {
  aulaDependencyInputsV1,
  assertApprovedAulaBuildV1,
  aulaEngineRefV1,
} from '../../../02_proceso/workflows/multimedia/_runner/aula-build-dependencies-v1.ts';

let root: string;
const sha = (text: string) => createHash('sha256').update(text).digest('hex');
beforeEach(() => {
  root = mkdtempSync(resolve(tmpdir(), 'aula-deps-fixture-'));
});
afterEach(() => rmSync(root, {recursive: true, force: true}));
const put = (ref: string, text: string) => {
  const file = resolve(root, ref);
  mkdirSync(resolve(file, '..'), {recursive: true});
  writeFileSync(file, text);
  return sha(text);
};
function binding(bank = false) {
  const deps = [
    {
      role: 'profile',
      ref: 'assets/core/profiles/metodologia.json',
      sha256: put(`${aulaEngineRefV1}/assets/core/profiles/metodologia.json`, 'profile'),
    },
    {
      role: 'font',
      ref: 'assets/core/fonts/font.ttf',
      sha256: put(`${aulaEngineRefV1}/assets/core/fonts/font.ttf`, 'font'),
    },
    {
      role: 'core-catalog',
      ref: 'assets/core/catalog.json',
      sha256: put(`${aulaEngineRefV1}/assets/core/catalog.json`, 'catalog'),
    },
    ...(bank
      ? [
          {
            role: 'bank-manifest',
            ref: 'bank/manifest.json',
            sha256: put('bank/manifest.json', 'manifest'),
          },
          {
            role: 'bank-catalog',
            ref: 'bank/catalog.json',
            sha256: put('bank/catalog.json', 'bank catalog'),
          },
          {
            role: 'asset',
            ref: 'bank/scenes/scene.json',
            sha256: put('bank/scenes/scene.json', 'scene'),
          },
        ]
      : []),
  ];
  return AulaBuildBindingV1Schema.parse({
    engineVersion: '1.1.0',
    profile: {id: 'metodologia', sha256: deps[0]!.sha256},
    buildDependencies: deps,
    assetEvidence: bank
      ? [
          {
            id: 'scene',
            kind: 'scene',
            sha256: sha('scene'),
            source: 'bank',
            catalogSha256: sha('bank catalog'),
          },
        ]
      : [],
    ...(bank ? {bankRef: 'bank'} : {}),
  });
}
describe('Aula dependency approval closure', () => {
  it('uses the existing twelve-output envelope for linked pieces and blocks thirteen', () => {
    const current = binding();
    const generated = [
      'artifact.html',
      'artifact-mobile.html',
      'artifact-audience.html',
      'artifact-mobile-audience.html',
      'artifact.md',
      'receipt.json',
    ];
    const linked = Array.from({length: 7}, (_, i) => ({
      role: 'linked-piece' as const,
      ref: `input/piece-${i}.html`,
      sha256: put(`piece-${i}.html`, 'practice'),
    }));
    const plan = (count: number) => ({
      ...current,
      outputs: [...generated, ...linked.slice(0, count).map((dep) => dep.ref.slice(6))],
      buildDependencies: [...current.buildDependencies!, ...linked.slice(0, count)],
    });
    expect(AulaBuildPlanV1Schema.parse(plan(6)).outputs).toHaveLength(12);
    expect(AulaBuildPlanV1Schema.safeParse(plan(7)).success).toBe(false);
    expect(
      AulaBuildPlanV1Schema.safeParse({
        ...current,
        outputs: Array.from({length: 11}, (_, i) => `generated-${i}.html`),
      }).success,
    ).toBe(false);
  });

  it('accepts neutral white-label system fonts while requiring its profile and core catalog', () => {
    const current = binding();
    const neutral = {
      ...current,
      profile: {...current.profile!, id: 'white-label' as const},
      buildDependencies: current.buildDependencies!.filter((dep) => dep.role !== 'font'),
    };
    expect(AulaBuildBindingV1Schema.parse(neutral).profile?.id).toBe('white-label');
    expect(() =>
      AulaBuildBindingV1Schema.parse({
        ...neutral,
        buildDependencies: neutral.buildDependencies.filter((dep) => dep.role !== 'profile'),
      }),
    ).toThrow(/PROFILE_DEPENDENCIES/);
  });
  it('hashes linked inputs inside the declared source directory and requires that context', () => {
    const current = binding();
    const linked = {
      role: 'linked-piece' as const,
      ref: 'input/practice.html',
      sha256: put('source/practice.html', 'practice'),
    };
    const full = {...current, buildDependencies: [...current.buildDependencies!, linked]};
    expect(aulaDependencyInputsV1(root, full, 'source/input.json').at(-1)?.ref).toBe(
      'source/practice.html',
    );
    expect(() => aulaDependencyInputsV1(root, full)).toThrow(/LINKED_INPUT_REQUIRED/);
    writeFileSync(resolve(root, 'source/practice.html'), 'drift');
    expect(() => aulaDependencyInputsV1(root, full, 'source/input.json')).toThrow(
      /DEPENDENCY_STALE/,
    );
  });
  it('accepts legacy plans without inventing a dependency approval', () => {
    expect(AulaBuildPlanV1Schema.parse({outputs: ['artifact.html', 'receipt.json']})).toEqual({
      outputs: ['artifact.html', 'receipt.json'],
    });
    expect(AulaBuildBindingV1Schema.parse({})).toEqual({});
    expect(() => AulaBuildBindingV1Schema.parse({bankRef: 'bank'})).toThrow(/BANK_NOT_SUPPORTED/);
  });
  it('rejects partial metadata, unknown fields, duplicate dependencies and unbound asset evidence', () => {
    const b = binding();
    for (const mutation of [
      {...b, profile: undefined},
      {...b, untrusted: true},
      {...b, buildDependencies: [...b.buildDependencies!, b.buildDependencies![0]!]},
      {
        ...b,
        assetEvidence: [
          {
            id: 'x',
            kind: 'icon',
            sha256: sha('absent'),
            source: 'core',
            catalogSha256: sha('catalog'),
          },
        ],
      },
      {...b, profile: {...b.profile!, sha256: sha('wrong profile')}},
    ])
      expect(() => AulaBuildBindingV1Schema.parse(mutation)).toThrow();
  });
  it('resolves only root-contained declared core and bank bytes with exact hashes', () => {
    const b = binding(true);
    expect(aulaDependencyInputsV1(root, b)).toHaveLength(6);
    expect(
      aulaDependencyInputsV1(root, b).every(
        (dep) => sha(readFileSync(resolve(root, dep.ref), 'utf8')) === dep.sha256,
      ),
    ).toBe(true);
    writeFileSync(resolve(root, 'bank/scenes/scene.json'), 'changed');
    expect(() => aulaDependencyInputsV1(root, b)).toThrow(/DEPENDENCY_STALE/);
  });
  it('rejects absent bank authorization, missing manifest and directory symlinks', () => {
    const b = binding(true);
    expect(() => aulaDependencyInputsV1(root, {...b, bankRef: undefined})).toThrow(/BANK_REQUIRED/);
    expect(() =>
      aulaDependencyInputsV1(root, {
        ...b,
        buildDependencies: b.buildDependencies!.filter((dep) => dep.role !== 'bank-manifest'),
      }),
    ).toThrow(/BANK_BINDING_INCOMPLETE/);
    rmSync(resolve(root, 'bank/scenes'), {recursive: true});
    symlinkSync(resolve(root, `${aulaEngineRefV1}/assets/core`), resolve(root, 'bank/scenes'));
    expect(() => aulaDependencyInputsV1(root, b)).toThrow(/PATH002/);
  });
  it('blocks stale approved profile, asset hashes and bank route while legacy bindings remain compatible', () => {
    const b = binding(true);
    expect(() => assertApprovedAulaBuildV1({buildBinding: b}, b)).not.toThrow();
    for (const changed of [
      {...b, bankRef: 'other'},
      {...b, profile: {...b.profile!, sha256: sha('new')}},
      {...b, assetEvidence: []},
    ])
      expect(() => assertApprovedAulaBuildV1({buildBinding: b}, changed)).toThrow(
        /SPEC_DEPENDENCIES_STALE/,
      );
    expect(() => assertApprovedAulaBuildV1({}, {})).not.toThrow();
  });
});
