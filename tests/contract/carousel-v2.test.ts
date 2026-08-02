import {describe, expect, it} from 'vitest';

import {CarouselSpecV1Schema} from '../../workflows/content/types/carousel/schema.ts';

const digest = '0'.repeat(64);
const bindingHashes = {
  workOrderSha256: digest,
  canonicalUnitSha256: digest,
  brandProfileSha256: digest,
  voiceProfileSha256: digest,
  channelProfileSha256: digest,
};

const card = (
  position: number,
  role: 'conclusion' | 'tension' | 'support' | 'evidence' | 'action' | 'cta',
) => ({
  cardId: `CAR-TEST-C${String(position).padStart(2, '0')}`,
  position,
  role,
  title: position === 1 ? 'Método antes que herramientas' : `Tarjeta número ${position}`,
  body: 'Texto útil, explícito y verificable para una prueba contractual.',
  bullets: [],
  ...(role === 'support' ? {pillar: 'P1' as const} : {}),
  evidence: {
    kind: 'first_party_statement' as const,
    label: 'Evidencia first-party para la prueba.',
    shortLabel: 'Fuente primaria',
    sourceIds: ['SRC-TEST-001'],
    claimIds: ['CLM-TEST-001'],
    limitation: 'No concede publicación ni afirma resultados.',
  },
  altText:
    'Descripción accesible suficientemente específica de esta tarjeta de prueba del carrusel.',
  visualCue: 'Geometría first-party sin assets externos.',
});

const validSpec = {
  schemaVersion: 'carousel-spec-v1' as const,
  carouselId: 'CAR-TEST-001',
  version: '1.0.0',
  status: 'RENDERED_DRAFT' as const,
  generatedAt: '2026-07-20T17:30:00.000Z',
  workOrderRef: 'projects/test/work-order.json',
  canonicalUnitRef: 'projects/test/editorial-unit.json',
  brandProfileRef: 'registries/brand/brand-profile-v2.yml',
  voiceProfileRef: 'registries/brand/voice-profile-v2.yml',
  channelProfileRef: 'registries/channels/instagram-channel-profile-v1.yml',
  bindingHashes,
  locale: 'es-LatAm' as const,
  theme: 'social-light' as const,
  dimensions: {width: 1080, height: 1350, aspectRatio: '4:5', safeZonePx: 72},
  cards: [card(1, 'conclusion'), card(2, 'support'), card(3, 'cta')],
  caption:
    'Conclusión primero. Tres apoyos verificables. Evidencia honesta y una acción de un movimiento.',
  deckAltText:
    'Carrusel de tres tarjetas que abre con una conclusión, desarrolla un soporte y cierra con una acción.',
  cta: 'Define hoy el resultado que quieres mejorar.',
  sourceIds: ['SRC-TEST-001'],
  claimIds: ['CLM-TEST-001'],
  rights: {
    assets: 'first_party_procedural_only' as const,
    fonts: 'OFL-1.1' as const,
    externalDistributionAuthorized: false as const,
  },
  renderPolicy: {
    networkAllowed: false as const,
    randomnessAllowed: false as const,
    wallClockAllowed: false as const,
    copyEmbeddedInRenderer: false as const,
  },
};

describe('carousel contract v1', () => {
  it('accepts ES-LatAm copy with diacritics and strict bindings', () => {
    expect(CarouselSpecV1Schema.parse(validSpec).cards).toHaveLength(3);
  });

  it('rejects unknown fields and a state beyond rendered draft', () => {
    expect(CarouselSpecV1Schema.safeParse({...validSpec, unexpected: true}).success).toBe(false);
    expect(CarouselSpecV1Schema.safeParse({...validSpec, status: 'READY'}).success).toBe(false);
  });

  it('rejects duplicate or non-contiguous positions', () => {
    const cards = [card(1, 'conclusion'), card(1, 'support'), card(3, 'cta')];
    expect(CarouselSpecV1Schema.safeParse({...validSpec, cards}).success).toBe(false);
  });

  it('rejects missing alt text, long copy and unsupported CJK/RTL/emoji profiles', () => {
    const candidates = [
      {...card(2, 'support'), altText: ''},
      {...card(2, 'support'), title: 'x'.repeat(97)},
      {...card(2, 'support'), title: '方法 primero'},
      {...card(2, 'support'), title: 'طريقة primero'},
      {...card(2, 'support'), title: 'Método 🚀'},
    ];
    for (const candidate of candidates) {
      const cards = [card(1, 'conclusion'), candidate, card(3, 'cta')];
      expect(CarouselSpecV1Schema.safeParse({...validSpec, cards}).success).toBe(false);
    }
  });

  it('rejects orphan claims and sources', () => {
    const unsupportedClaim = {
      ...card(2, 'support'),
      evidence: {...card(2, 'support').evidence, claimIds: ['CLM-ORPHAN-001']},
    };
    const unsupportedSource = {
      ...card(2, 'support'),
      evidence: {...card(2, 'support').evidence, sourceIds: ['SRC-ORPHAN-001']},
    };
    for (const candidate of [unsupportedClaim, unsupportedSource]) {
      expect(
        CarouselSpecV1Schema.safeParse({
          ...validSpec,
          cards: [card(1, 'conclusion'), candidate, card(3, 'cta')],
        }).success,
      ).toBe(false);
    }
  });

  it('fails closed if external distribution or runtime entropy is enabled', () => {
    expect(
      CarouselSpecV1Schema.safeParse({
        ...validSpec,
        rights: {...validSpec.rights, externalDistributionAuthorized: true},
      }).success,
    ).toBe(false);
    expect(
      CarouselSpecV1Schema.safeParse({
        ...validSpec,
        renderPolicy: {...validSpec.renderPolicy, networkAllowed: true},
      }).success,
    ).toBe(false);
  });
});
