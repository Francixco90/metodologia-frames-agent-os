import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

import {
  calculateMethodologiaVerticalMetadata,
  methodologiaVerticalPropsSchema,
} from '../../../renderers/remotion/src/schema.ts';

const root = process.cwd();
const propsPath = resolve(root, 'projects/vs-001-source-to-campaign/remotion/05-input-props.json');
const validProps: unknown = JSON.parse(readFileSync(propsPath, 'utf8'));

describe('MethodologiaVertical props and metadata', () => {
  it('parses the hash-bound local-only props with Zod 4', () => {
    const parsed = methodologiaVerticalPropsSchema.parse(validProps);

    expect(parsed.status).toBe('RENDERED_DRAFT');
    expect(parsed.scopeBadge).toBe('LOCAL TEST ONLY');
    expect(parsed.sourceSnapshot.normalizedSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(parsed.canonicalCoverage).toEqual({
      confirmed: 0,
      expected: 4,
      semantic: 'coverage_gap_not_kpi',
    });
    expect(parsed.audio).toEqual({
      mode: 'silent-first',
      streams: [],
      reason: 'no-audio-rights-receipt',
    });
  });

  it('calculates dimensions, fps and duration from validated props', async () => {
    const parsed = methodologiaVerticalPropsSchema.parse(validProps);
    const metadata = await calculateMethodologiaVerticalMetadata({
      defaultProps: parsed,
      props: parsed,
      abortSignal: new AbortController().signal,
      compositionId: 'MethodologiaVertical',
      isRendering: true,
    });

    expect(metadata).toMatchObject({
      width: 1080,
      height: 1920,
      fps: 30,
      durationInFrames: 1231,
      defaultCodec: 'h264',
      defaultPixelFormat: 'yuv420p',
    });
  });

  it('rejects state escalation, unknown props and caption overlap', () => {
    const parsed = methodologiaVerticalPropsSchema.parse(validProps);

    expect(methodologiaVerticalPropsSchema.safeParse({...parsed, status: 'READY'}).success).toBe(
      false,
    );
    expect(
      methodologiaVerticalPropsSchema.safeParse({...parsed, externalUrl: 'https://example.test'})
        .success,
    ).toBe(false);

    const hostile = structuredClone(parsed);
    const firstCaption = hostile.captions[0];
    const secondCaption = hostile.captions[1];
    expect(firstCaption).toBeDefined();
    expect(secondCaption).toBeDefined();
    if (firstCaption !== undefined && secondCaption !== undefined) {
      firstCaption.endFrame = secondCaption.startFrame + 1;
    }
    expect(methodologiaVerticalPropsSchema.safeParse(hostile).success).toBe(false);
  });
});
