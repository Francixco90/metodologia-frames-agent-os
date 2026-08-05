import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse as parseYaml} from 'yaml';
import {describe, expect, it} from 'vitest';

import {SourceFreezeReceiptV1Schema} from '../../../../core/contracts/creation-v3.ts';
import {sha256Text} from '../../../../core/evidence/hash.ts';
import {
  adaptLegacyCarouselEditorialInputV1,
  LegacyCarouselSourceSnapshotV1Schema,
  parseLegacyCarouselEditorialYaml,
} from '../../../../workflows/content/markdown/legacy-carousel-adapter.ts';
import {
  assertPublicContentPolicy,
  loadCanonicalContent,
  parseCanonicalContentMarkdown,
} from '../../../../workflows/content/markdown/parse-canonical-content.ts';
import {
  buildSourceFreezeReceipt,
  computeSourceFreezeReceiptSha256,
} from '../../../../workflows/content/markdown/source-freeze.ts';

const root = process.cwd();
const contentRef = 'content/pilot-carousel-002/content.md';
const read = (ref: string): string => readFileSync(resolve(root, ref), 'utf8');

describe('CanonicalContentDocumentV1', () => {
  it('parses the authored pilot and preserves the creation-only boundary', () => {
    const loaded = loadCanonicalContent(root, contentRef);

    expect(loaded.document).toMatchObject({
      schemaVersion: 'canonical-content-document-v1',
      frontmatter: {
        contentId: 'pilot-carousel-002',
        authoredStatus: 'DRAFT',
        distributionState: 'NOT_DESIGNED',
        publicationAuthority: false,
      },
    });
    expect(loaded.document.body.narrativeBeats).toHaveLength(8);
    expect(loaded.document.body.claims).toHaveLength(6);
    expect(loaded.manifest.readSet).toHaveLength(23);
    expect(loaded.resolvedClaims).toHaveLength(6);

    const routerBeat = loaded.document.body.narrativeBeats.find(
      ({purpose}) => purpose === 'visual_router',
    );
    expect(routerBeat).toMatchObject({
      stateDisclosure: 'planned_capability',
      plannedCapabilityIds: ['d3', 'three', 'lottie', 'gsap', 'remotion-v3-creative-compositor'],
    });
  });

  it('separates byte identity from semantic identity', () => {
    const raw = read(contentRef);
    const canonical = parseCanonicalContentMarkdown(raw);
    const reflowed = parseCanonicalContentMarkdown(raw.replaceAll('\n', '\r\n'));
    const reordered = parseCanonicalContentMarkdown(
      raw.replace(
        'content_id: pilot-carousel-002\nversion: 0.1.0',
        'version: 0.1.0\ncontent_id: pilot-carousel-002',
      ),
    );
    const changed = parseCanonicalContentMarkdown(
      raw.replace('la velocidad no reemplaza la dirección', 'la velocidad necesita dirección'),
    );

    expect(reflowed.rawSha256).not.toBe(canonical.rawSha256);
    expect(reflowed.semanticSha256).toBe(canonical.semanticSha256);
    expect(reordered.semanticSha256).toBe(canonical.semanticSha256);
    expect(changed.semanticSha256).not.toBe(canonical.semanticSha256);
  });

  it('builds a self-hashed receipt capped at SCOPED', () => {
    const loaded = loadCanonicalContent(root, contentRef);
    const receipt = buildSourceFreezeReceipt(contentRef, loaded);
    const {receiptSha256, ...unsigned} = receipt;

    expect(SourceFreezeReceiptV1Schema.parse(receipt)).toEqual(receipt);
    expect(receiptSha256).toBe(computeSourceFreezeReceiptSha256(unsigned));
    expect(receipt).toMatchObject({
      authoredStatus: 'DRAFT',
      maximumState: 'SCOPED',
      authorityState: 'candidate_limited',
      globalSourceLocked: false,
      distributionState: 'NOT_DESIGNED',
      publicationAuthority: false,
    });
    expect(receipt.producerActorInstanceId).not.toBe(receipt.verifierActorInstanceId);
  });

  it('applies the candidate voice red list to public copy', () => {
    const loaded = loadCanonicalContent(root, contentRef);
    const voice = parseYaml(read('registries/brand/voice-profile-v2.yml')) as {
      red_list: string[];
    };

    expect(() => assertPublicContentPolicy(loaded.document, voice.red_list)).not.toThrow();
  });
});

describe('CarouselSpecV1 compatibility adapter', () => {
  it('projects V1 read-only without mutating or promoting historical inputs', () => {
    const inputRaw = read('projects/pilot-carousel-001/editorial/pilot-content.yml');
    const snapshotRaw = read('projects/pilot-carousel-001/spec/source-snapshot.json');
    const input = parseLegacyCarouselEditorialYaml(inputRaw);
    const snapshot = LegacyCarouselSourceSnapshotV1Schema.parse(JSON.parse(snapshotRaw));
    const before = JSON.stringify({input, snapshot});
    const provenance = {
      legacyInputSha256: sha256Text(inputRaw),
      legacySnapshotSha256: sha256Text(snapshotRaw),
    };

    const first = adaptLegacyCarouselEditorialInputV1(input, snapshot, provenance);
    const second = adaptLegacyCarouselEditorialInputV1(input, snapshot, provenance);

    expect(first).toEqual(second);
    expect(JSON.stringify({input, snapshot})).toBe(before);
    expect(first).toMatchObject({
      legacyReadOnly: true,
      authoredStatus: 'DRAFT',
      maximumState: 'SCOPED',
      publicationAuthority: false,
    });
    expect(first.warnings).toEqual(
      expect.arrayContaining([
        'legacy_visual_direction_requires_authored_v3',
        'legacy_snapshot_is_provenance_not_authority',
        'legacy_claims_are_not_promoted',
      ]),
    );
  });
});
