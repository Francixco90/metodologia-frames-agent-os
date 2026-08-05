import {mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

import {describe, expect, it} from 'vitest';

import {
  CanonicalContentDocumentV1Schema,
  SourceFreezeManifestV1Schema,
  SourceFreezeReceiptV1Schema,
} from '../../../../core/contracts/creation-v3.ts';
import {sha256Text} from '../../../../core/evidence/hash.ts';
import {
  adaptLegacyCarouselEditorialInputV1,
  LegacyCarouselSourceSnapshotV1Schema,
  parseLegacyCarouselEditorialYaml,
} from '../../../../workflows/content/markdown/legacy-carousel-adapter.ts';
import {
  assertHashBoundFile,
  assertPublicContentPolicy,
  loadCanonicalContent,
  parseCanonicalContentMarkdown,
  parseStrictSnakeCaseYaml,
} from '../../../../workflows/content/markdown/parse-canonical-content.ts';
import {buildSourceFreezeReceipt} from '../../../../workflows/content/markdown/source-freeze.ts';

const root = process.cwd();
const contentRef = 'content/pilot-carousel-002/content.md';
const raw = readFileSync(resolve(root, contentRef), 'utf8');

const expectParseFailure = (candidate: string, message: string | RegExp): void => {
  expect(() => parseCanonicalContentMarkdown(candidate)).toThrow(message);
};

describe('CanonicalContentDocumentV1 adversarial rejection', () => {
  it('rejects unknown and duplicate frontmatter fields', () => {
    expectParseFailure(
      raw.replace(
        'schema_version: canonical-content-document-v1',
        'schema_version: canonical-content-document-v1\nunexpected_field: true',
      ),
      /unrecognized|unknown/i,
    );
    expectParseFailure(
      raw.replace(
        'content_id: pilot-carousel-002',
        'content_id: pilot-carousel-002\ncontent_id: duplicate',
      ),
      /Map keys must be unique|duplicate/i,
    );
  });

  it.each([
    ['anchor', 'brand_id: &brand metodologia'],
    ['custom tag', 'brand_id: !unsafe metodologia'],
    ['merge key', 'brand_id: metodologia\nmerge_source: &base {brand_id: metodologia}\n<<: *base'],
  ])('rejects forbidden YAML feature: %s', (_label, replacement) => {
    expect(() =>
      parseStrictSnakeCaseYaml(`schema_version: canonical-content-document-v1\n${replacement}\n`),
    ).toThrow(/forbidden|invalid_yaml|unknown_field/i);
  });

  it('rejects unknown, duplicate and out-of-order Markdown sections', () => {
    expectParseFailure(
      raw.replace('\n## Límites\n', '\n## Sección inventada\n'),
      /UNKNOWN_SECTION/u,
    );
    expectParseFailure(
      raw.replace('## Problema', '## Audiencia\n\nDuplicada.\n\n## Problema'),
      /DUPLICATE_SECTION/u,
    );
    expectParseFailure(
      raw
        .replace('\n## Audiencia\n', '\n## TEMPORAL\n')
        .replace('\n## Problema\n', '\n## Audiencia\n')
        .replace('\n## TEMPORAL\n', '\n## Problema\n'),
      /INVALID_SECTION_ORDER/u,
    );
  });

  it.each([
    ['inline HTML', '<script>alert(1)</script>'],
    ['network link', '[fuente](https://example.com)'],
    ['embedded image', '![asset](asset.png)'],
    ['fenced block', '```text\ncontenido\n```'],
  ])('rejects unsafe authored Markdown: %s', (_label, payload) => {
    expectParseFailure(
      raw.replace(
        'Profesionales y equipos que quieren adoptar IA',
        `Profesionales y equipos que quieren adoptar IA ${payload}`,
      ),
      /UNSAFE_MARKDOWN/u,
    );
  });

  it('rejects a second thesis and an orphan claim', () => {
    expectParseFailure(
      raw.replace('## Audiencia', '# Otra tesis\n\n## Audiencia'),
      /second H1|INVALID_MARKDOWN/i,
    );
    expectParseFailure(
      raw.replace(
        '`CLM-PILOT2-PIPELINE-001`, `CLM-PILOT2-BOUNDARY-001`',
        '`CLM-PILOT2-PIPELINE-001`',
      ),
      /claim CLM-PILOT2-BOUNDARY-001 is not used/i,
    );
  });

  it('rejects undeclared capabilities and false availability assertions', () => {
    expectParseFailure(
      raw.replace(
        '`d3`, `three`, `lottie`, `gsap`, `remotion-v3-creative-compositor`',
        '`d3`, `three`, `lottie`, `gsap`, `unknown-renderer`',
      ),
      /Invalid option|unknown-renderer/i,
    );
    const document = parseCanonicalContentMarkdown(
      raw.replace(
        'D3, Three.js, Lottie, GSAP y Remotion responden a intenciones distintas',
        'D3, Three.js, Lottie, GSAP y Remotion están disponibles',
      ),
    );
    expect(() => assertPublicContentPolicy(document, [])).toThrow(/RENDERER_UNAVAILABLE/u);
  });

  it('rejects red-list drift and stale hash bindings', () => {
    const document = parseCanonicalContentMarkdown(raw);
    expect(() => assertPublicContentPolicy(document, ['herramientas'])).toThrow(/BRAND_DRIFT/u);
    expect(() =>
      assertHashBoundFile(root, {
        schemaVersion: 'hash-bound-ref-v1',
        ref: 'docs/program/instagram-content-creation-network-v3.md',
        sha256: '0'.repeat(64),
      }),
    ).toThrow(/HASH_MISMATCH/u);
  });

  it('rejects absolute authored paths, traversal and symlinks outside the root', () => {
    expectParseFailure(
      raw.replace(
        'Profesionales y equipos que quieren adoptar IA',
        'Profesionales que consultan /etc/passwd y equipos que quieren adoptar IA',
      ),
      /UNSAFE_MARKDOWN/u,
    );
    expect(() => loadCanonicalContent(root, '../content.md')).toThrow(
      /Path traversal|UNSAFE_PATH/u,
    );

    const sandbox = mkdtempSync(join(tmpdir(), 'creation-h01-path-'));
    const repository = join(sandbox, 'repository');
    const external = join(sandbox, 'external.txt');
    let symlinkBlockedByOs = false;
    try {
      mkdirSync(repository);
      writeFileSync(external, 'external evidence\n');
      try {
        symlinkSync(external, join(repository, 'evidence.txt'));
      } catch (error) {
        if (
          error instanceof Error &&
          'code' in error &&
          (error as NodeJS.ErrnoException).code === 'EPERM'
        ) {
          // Windows without Developer Mode cannot create symlinks.
          // The security invariant (reject external symlinks) is implicitly
          // satisfied: the OS blocks the symlink before the harness can.
          // Coverage is maintained on Linux/macOS and Windows with Developer Mode.
          symlinkBlockedByOs = true;
          console.warn(
            'SKIP: symlinkSync EPERM — Windows without Developer Mode. ' +
              'Symlink rejection is implicitly enforced by the OS.',
          );
        } else {
          throw error;
        }
      }
      if (!symlinkBlockedByOs) {
        expect(() =>
          assertHashBoundFile(repository, {
            schemaVersion: 'hash-bound-ref-v1',
            ref: 'evidence.txt',
            sha256: sha256Text('external evidence\n'),
          }),
        ).toThrow(/UNSAFE_PATH/u);

        writeFileSync(external, raw);
        symlinkSync(external, join(repository, 'content.md'));
        expect(() => loadCanonicalContent(repository, 'content.md')).toThrow(/UNSAFE_PATH/u);
      }
    } finally {
      rmSync(sandbox, {recursive: true, force: true});
    }
  });

  it('enforces capability identity, disclosure and accessibility references', () => {
    const {document} = loadCanonicalContent(root, contentRef);

    const wrongLabel = structuredClone(document);
    wrongLabel.frontmatter.plannedCapabilities[0]!.label = 'GSAP';
    expect(() => CanonicalContentDocumentV1Schema.parse(wrongLabel)).toThrow(/requires label/u);

    const emptyDisclosure = structuredClone(document);
    const routerBeat = emptyDisclosure.body.narrativeBeats.find(
      ({purpose}) => purpose === 'visual_router',
    )!;
    routerBeat.plannedCapabilityIds = [];
    expect(() => CanonicalContentDocumentV1Schema.parse(emptyDisclosure)).toThrow(
      /requires at least one declared capability/u,
    );

    const unknownAccessibleCapability = structuredClone(document);
    unknownAccessibleCapability.body.visualDirection.accessibility.readingOrderRefs.push(
      'capability:bogus',
    );
    expect(() => CanonicalContentDocumentV1Schema.parse(unknownAccessibleCapability)).toThrow(
      /undeclared planned capability/u,
    );
  });

  it('binds authority, profiles and legacy provenance to the exact read set', () => {
    const {manifest} = loadCanonicalContent(root, contentRef);
    const crossedAuthority = structuredClone(manifest);
    crossedAuthority.authorities[0]!.readSetBindingId =
      crossedAuthority.authorities[1]!.readSetBindingId;
    expect(() => SourceFreezeManifestV1Schema.parse(crossedAuthority)).toThrow(
      /material owned by/u,
    );

    const unfrozenProfile = structuredClone(manifest);
    unfrozenProfile.profileBindings.brand.sha256 = '0'.repeat(64);
    expect(() => SourceFreezeManifestV1Schema.parse(unfrozenProfile)).toThrow(
      /profile brand is outside/u,
    );

    const unfrozenLegacy = structuredClone(manifest);
    unfrozenLegacy.legacyProvenance.input.sha256 = '0'.repeat(64);
    expect(() => SourceFreezeManifestV1Schema.parse(unfrozenLegacy)).toThrow(
      /legacy input is outside/u,
    );
  });

  it('rejects legacy source drift and non-contiguous card positions', () => {
    const inputRaw = readFileSync(
      resolve(root, 'projects/pilot-carousel-001/editorial/pilot-content.yml'),
      'utf8',
    );
    const snapshotRaw = readFileSync(
      resolve(root, 'projects/pilot-carousel-001/spec/source-snapshot.json'),
      'utf8',
    );
    const input = parseLegacyCarouselEditorialYaml(inputRaw);
    const snapshot = LegacyCarouselSourceSnapshotV1Schema.parse(JSON.parse(snapshotRaw));
    const provenance = {
      legacyInputSha256: sha256Text(inputRaw),
      legacySnapshotSha256: sha256Text(snapshotRaw),
    };

    const sourceDrift = structuredClone(input);
    sourceDrift.sources[0]!.ref = 'evidence/other.md';
    expect(() => adaptLegacyCarouselEditorialInputV1(sourceDrift, snapshot, provenance)).toThrow(
      /not snapshot-bound/u,
    );

    const duplicatePosition = structuredClone(input);
    duplicatePosition.cards[1]!.position = 1;
    expect(() =>
      adaptLegacyCarouselEditorialInputV1(duplicatePosition, snapshot, provenance),
    ).toThrow(/positions must be contiguous/u);
  });

  it('rejects receipt privilege escalation and actor conflation', () => {
    const receipt = buildSourceFreezeReceipt(contentRef, loadCanonicalContent(root, contentRef));
    expect(() =>
      SourceFreezeReceiptV1Schema.parse({...receipt, publicationAuthority: true}),
    ).toThrow();
    expect(() =>
      SourceFreezeReceiptV1Schema.parse({
        ...receipt,
        verifierActorInstanceId: receipt.producerActorInstanceId,
      }),
    ).toThrow(/OWNERSHIP_CONFLICT/u);
  });
});
