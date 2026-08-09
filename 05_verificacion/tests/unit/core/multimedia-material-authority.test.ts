import {describe, expect, it} from 'vitest';

import {assertProducerAuthority} from 'workflows/multimedia/_runner/material-input.ts';
import {calculateMultimediaWorkOrderHash} from 'workflows/multimedia/_runner/output-selection.ts';

const workOrder = {
  schema_version: 'multimedia-work-order-v1' as const,
  work_order_id: 'WO-P03-ACTOR',
  workflow_id: 'P03' as const,
  intent_hash: 'a'.repeat(64),
  producer_actor_id: 'content-producer-local',
  allowed_outputs: ['brief-campaign-map-v1'],
  effect_class: 'local_reversible' as const,
  publication_policy: 'forbidden' as const,
};

describe('material producer authority', () => {
  it('binds producer identity into the work-order digest', () => {
    expect(calculateMultimediaWorkOrderHash(workOrder)).not.toBe(
      calculateMultimediaWorkOrderHash({...workOrder, producer_actor_id: 'spoofed-producer'}),
    );
  });

  it('blocks a manifest actor that differs from the authorized producer', () => {
    expect(() => assertProducerAuthority('content-producer-local', 'spoofed-producer')).toThrow(
      /MW-MATERIAL-AUTHORITY005/u,
    );
  });
});
