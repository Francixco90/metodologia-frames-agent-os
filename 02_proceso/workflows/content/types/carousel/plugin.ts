import {createHash} from 'node:crypto';

import {CarouselSpecV1Schema, type CarouselSpecV1} from './schema.ts';

export const carouselPluginManifest = {
  schemaVersion: 'content-type-plugin-v1',
  pluginId: 'carousel',
  contentType: 'carousel',
  surface: 'instagram-feed',
  implementationState: 'active_candidate',
  rendererId: 'static-social-carousel-v1',
  outputs: [
    'individual_pngs',
    'contact_sheet',
    'offline_gallery',
    'spec',
    'copy',
    'caption',
    'alt_text',
    'asset_manifest',
    'receipt',
    'guardian_review',
  ],
  gates: [
    'CAROUSEL_SPEC_APPROVED',
    'SEQUENCE_APPROVED',
    'CAROUSEL_BUILD_VALIDATED',
    'SWIPE_REVIEW_APPROVED',
    'RIGHTS_A11Y_PASS',
    'GUARDIAN_PASS',
    'WORKFLOW_PILOT_REVIEW',
  ],
} as const;

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
};

export const validateCarouselSpec = (input: unknown): CarouselSpecV1 =>
  CarouselSpecV1Schema.parse(input);

export const hashCarouselSpec = (spec: CarouselSpecV1): string =>
  createHash('sha256').update(stableStringify(spec)).digest('hex');

export const orderedCarouselCards = (spec: CarouselSpecV1) =>
  [...spec.cards].sort((left, right) => left.position - right.position);
