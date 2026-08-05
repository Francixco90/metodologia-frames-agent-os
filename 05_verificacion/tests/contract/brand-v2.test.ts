import {cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';

import {parse} from 'yaml';
import {afterEach, describe, expect, it} from 'vitest';

import {
  evaluateChannelFreshness,
  validateBrand,
  validateChannelProfileObject,
  validateSourceBundleObject,
  validateVoiceProfileObject,
} from '../../scripts/check-brand.ts';
import {loadBrandTokens, renderBrandProjections} from '../../scripts/generate-brand-projections.ts';

const root = process.cwd();
const temporaryRoots: string[] = [];

const record = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Expected object record');
  }
  return value as Record<string, unknown>;
};

const yaml = (relativePath: string): unknown =>
  parse(readFileSync(resolve(root, relativePath), 'utf8')) as unknown;

const temporaryBrandRoot = (): string => {
  const destination = mkdtempSync(resolve(tmpdir(), 'brand-v2-negative-'));
  temporaryRoots.push(destination);
  cpSync(resolve(root, 'brand'), resolve(destination, 'brand'), {recursive: true});
  cpSync(resolve(root, 'registries'), resolve(destination, 'registries'), {recursive: true});
  const docsProgram = resolve(destination, 'docs/program');
  cpSync(resolve(root, 'docs/program'), docsProgram, {
    recursive: true,
    filter: (source) =>
      !source.includes('file-disposition-ledger') ||
      source.endsWith('file-disposition-ledger.yml') ||
      source.endsWith('file-disposition-ledger.md'),
  });
  return destination;
};

afterEach(() => {
  for (const destination of temporaryRoots.splice(0)) {
    rmSync(destination, {recursive: true, force: true});
  }
});

describe('BrandProfileV2 and VoiceProfileV2 contracts', () => {
  it('validates authority, byte-level projections, offline fonts and rights', () => {
    expect(validateBrand(root)).toStrictEqual([]);
    const projections = renderBrandProjections(loadBrandTokens(root));
    for (const [relativePath, expected] of Object.entries(projections)) {
      expect(readFileSync(resolve(root, relativePath), 'utf8')).toBe(expected);
    }
  });

  it('rejects a dirty observational source promoted as brand authority', () => {
    const bundle = structuredClone(yaml('registries/brand/source-bundle-v1.yml'));
    const sources = record(bundle).sources;
    if (!Array.isArray(sources)) throw new Error('Expected source array');
    const sourceItems = sources as unknown[];
    const dirty = sourceItems.find((source) => record(source).source_id === 'BRAND-SRC-LLMS-DIRTY');
    if (dirty === undefined) throw new Error('Expected dirty fixture source');
    record(dirty).authority_class = 'stable_projection_authority';
    expect(validateSourceBundleObject(bundle).some((error) => error.startsWith('BR003'))).toBe(
      true,
    );
  });

  it('rejects elevation of the first-party voice candidate', () => {
    const voice = structuredClone(yaml('registries/brand/voice-profile-v2.yml'));
    record(voice).validation_state = 'VOICE_VALIDATED';
    expect(validateVoiceProfileObject(voice).some((error) => error.startsWith('VOICE'))).toBe(true);
  });

  it('binds official channel sources and blocks READY after the 30-day freshness window', () => {
    const channel = yaml('registries/channels/instagram-profile-v1.yml');
    expect(validateChannelProfileObject(channel)).toStrictEqual([]);
    expect(evaluateChannelFreshness(channel, new Date('2026-08-18T18:00:00.000Z'))).toStrictEqual({
      state: 'fresh',
      local_tests: 'allowed',
      ready: 'defer_to_remaining_gates',
    });
    expect(evaluateChannelFreshness(channel, new Date('2026-08-20T18:00:00.000Z'))).toStrictEqual({
      state: 'stale',
      local_tests: 'allowed',
      ready: 'blocked',
    });
  });

  it('rejects a non-official channel source substitution', () => {
    const channel = structuredClone(yaml('registries/channels/instagram-profile-v1.yml'));
    const sources = record(channel).source_bindings;
    if (!Array.isArray(sources) || sources[0] === undefined) {
      throw new Error('Expected channel source bindings');
    }
    record(sources[0]).canonical_uri = 'https://example.com/unofficial-instagram-spec';
    expect(
      validateChannelProfileObject(channel).some((error) => error.startsWith('CHANNEL002')),
    ).toBe(true);
  });

  it('fails closed with RIGHTS_GAP when an official local font is absent', () => {
    const destination = temporaryBrandRoot();
    rmSync(resolve(destination, 'brand/fonts/vendor/poppins/Poppins-Bold.ttf'));
    expect(
      validateBrand(destination).some(
        (error) => error.startsWith('BR007') && error.includes('RIGHTS_GAP'),
      ),
    ).toBe(true);
  });

  it('rejects a raw color added outside the authored source or generated projections', () => {
    const destination = temporaryBrandRoot();
    const profilePath = resolve(destination, 'registries/brand/brand-profile-v2.yml');
    const original = readFileSync(profilePath, 'utf8');
    writeFileSync(profilePath, `${original}\ninvalid_literal_fixture: '#123456'\n`);
    expect(validateBrand(destination).some((error) => error.startsWith('BR004'))).toBe(true);
  });
});
