import {describe, expect, it} from 'vitest';

import {
  isFinitePositiveRect,
  isInsideLayoutRect,
  isValidNormalizedBounds,
  layoutRectsOverlap,
  normalizedBoundsToLayoutRect,
  rectsApproximatelyEqual,
  segmentIntersectsRect,
  segmentsIntersect,
  segmentsOverlapBeyondSharedEndpoint,
  type LayoutRect,
} from '../../../../renderers/remotion/src/components/method-explainer/diagram-geometry.ts';

const rect = (left: number, top: number, right: number, bottom: number): LayoutRect => ({
  bottom,
  left,
  right,
  top,
});

describe('method explainer diagram geometry', () => {
  it('converts valid normalized bounds using composition dimensions', () => {
    expect(
      normalizedBoundsToLayoutRect({
        bounds: {height: 0.2, width: 0.5, x: 0.1, y: 0.25},
        compositionHeight: 1920,
        compositionWidth: 1080,
      }),
    ).toEqual({bottom: 864, left: 108, right: 648, top: 480});
  });

  it.each([
    {height: 0.2, width: 0, x: 0.1, y: 0.1},
    {height: -0.1, width: 0.2, x: 0.1, y: 0.1},
    {height: 0.2, width: 0.2, x: Number.NaN, y: 0.1},
    {height: 0.2, width: 0.2, x: 0.9, y: 0.1},
    {height: Number.POSITIVE_INFINITY, width: 0.2, x: 0.1, y: 0.1},
  ])('rejects invalid normalized bounds %#', (bounds) => {
    expect(isValidNormalizedBounds(bounds)).toBe(false);
    expect(() =>
      normalizedBoundsToLayoutRect({
        bounds,
        compositionHeight: 1920,
        compositionWidth: 1080,
      }),
    ).toThrow('DIAGRAM_GEOMETRY_INVALID');
  });

  it('rejects non-finite, zero-area, and inverted rectangles', () => {
    expect(isFinitePositiveRect(rect(0, 0, 100, 100))).toBe(true);
    expect(isFinitePositiveRect(rect(0, 0, 0, 100))).toBe(false);
    expect(isFinitePositiveRect(rect(0, 0, Number.NaN, 100))).toBe(false);
  });

  it('treats touching rectangles as non-overlapping but detects interior overlap', () => {
    const first = rect(10, 10, 30, 30);
    expect(layoutRectsOverlap(first, rect(30, 10, 50, 30))).toBe(false);
    expect(layoutRectsOverlap(first, rect(29, 10, 50, 30))).toBe(true);
    expect(isInsideLayoutRect(first, rect(0, 0, 40, 40))).toBe(true);
    expect(isInsideLayoutRect(rect(-2, 0, 20, 20), rect(0, 0, 40, 40), 1)).toBe(false);
  });

  it('detects crossings, collinear overlap, and a segment through a node', () => {
    expect(segmentsIntersect({x: 0, y: 0}, {x: 10, y: 10}, {x: 0, y: 10}, {x: 10, y: 0})).toBe(
      true,
    );
    expect(segmentIntersectsRect({x: 45, y: 15}, {x: 55, y: 25}, rect(40, 10, 60, 30))).toBe(true);
    expect(
      segmentsIntersect({x: 0.1, y: 0.1}, {x: 10.1, y: 10.1}, {x: 4.1, y: 4.1}, {x: 14.1, y: 14.1}),
    ).toBe(true);
    expect(
      segmentsIntersect(
        {x: 0.1, y: 0.1},
        {x: 10.1, y: 0.1},
        {x: 0.1, y: 0.1001},
        {x: 10.1, y: 0.1001},
      ),
    ).toBe(false);
    expect(() =>
      segmentsIntersect({x: Number.NaN, y: 0}, {x: 1, y: 1}, {x: 0, y: 1}, {x: 1, y: 0}),
    ).toThrow('DIAGRAM_GEOMETRY_INVALID');
    expect(segmentsOverlapBeyondSharedEndpoint({x: 0, y: 0}, {x: 10, y: 0}, {x: 20, y: 0})).toBe(
      true,
    );
    expect(segmentsOverlapBeyondSharedEndpoint({x: 0, y: 0}, {x: 10, y: 0}, {x: -20, y: 0})).toBe(
      false,
    );
  });

  it('compares measured and contract rectangles with a bounded epsilon', () => {
    expect(rectsApproximatelyEqual(rect(10, 10, 30, 30), rect(10.5, 9.5, 30.5, 29.5))).toBe(true);
    expect(rectsApproximatelyEqual(rect(10, 10, 30, 30), rect(12, 10, 30, 30))).toBe(false);
  });
});
