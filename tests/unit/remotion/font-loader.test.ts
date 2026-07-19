import {describe, expect, it} from 'vitest';

import {assertFontFaceLoaded, localFontSpecs} from '../../../renderers/remotion/src/font-loader.ts';

describe('local font gate', () => {
  it('binds exactly four unique local font declarations at weights 400 and 700', () => {
    expect(localFontSpecs).toHaveLength(4);
    expect(new Set(localFontSpecs.map(({assetId}) => assetId)).size).toBe(4);
    expect(new Set(localFontSpecs.map(({url}) => url)).size).toBe(4);
    expect(new Set(localFontSpecs.map(({family}) => family))).toEqual(
      new Set(['MetodologIA Work Sans', 'MetodologIA JetBrains Mono']),
    );
    expect(new Set(localFontSpecs.map(({weight}) => weight))).toEqual(new Set(['400', '700']));
    for (const spec of localFontSpecs) {
      expect(spec.url).not.toMatch(/^https?:/u);
    }
  });

  it('accepts loaded faces and rejects every non-loaded status with the asset ID', () => {
    expect(() =>
      assertFontFaceLoaded({assetId: 'FONT-WORK-SANS-REGULAR', status: 'loaded'}),
    ).not.toThrow();
    for (const status of ['unloaded', 'loading', 'error'] as const) {
      expect(() => assertFontFaceLoaded({assetId: 'FONT-WORK-SANS-REGULAR', status})).toThrow(
        `FONT_STATUS_INVALID asset=FONT-WORK-SANS-REGULAR status=${status}`,
      );
    }
  });
});
